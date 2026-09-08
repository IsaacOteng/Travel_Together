from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.users.models import User


def make_user(email, **kwargs):
    return User.objects.create_user(email=email, username=email.split("@")[0], **kwargs)


def firebase_claims(email, verified, provider="password", uid="fb-uid-1"):
    """A decoded Firebase id_token, shaped like firebase_admin returns it."""
    return {
        "uid":            uid,
        "email":          email,
        "email_verified": verified,
        "name":           "Mal Lory",
        "picture":        "",
        "firebase":       {"sign_in_provider": provider},
    }


class FirebaseAuthEmailVerificationTests(TestCase):
    """
    FirebaseAuthView matches (and then signs into) an existing account purely on
    the email claim. So it must refuse any provider that has not proven the
    address belongs to the person signing in otherwise registering
    victim@example.com in the Firebase project is a full account takeover.
    """

    URL = "/api/auth/firebase/"

    def setUp(self):
        self.client = APIClient()

    def _post(self, claims):
        with patch("firebase_admin.auth.verify_id_token", return_value=claims), \
             patch("apps.users.firebase_init.get_firebase_app", return_value=None):
            return self.client.post(self.URL, {"id_token": "stub"}, format="json")

    def test_unverified_email_cannot_take_over_an_existing_account(self):
        victim = make_user("victim@t.co")
        victim.first_name = "Real"
        victim.save()

        res = self._post(firebase_claims("victim@t.co", verified=False))

        self.assertEqual(res.status_code, 400)
        self.assertNotIn("access", res.json())
        victim.refresh_from_db()
        self.assertEqual(victim.first_name, "Real")     # not overwritten
        self.assertFalse(victim.google_uid)             # not linked

    def test_unverified_email_cannot_create_an_account(self):
        res = self._post(firebase_claims("brand-new@t.co", verified=False))
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(email="brand-new@t.co").exists())

    def test_missing_email_verified_claim_is_treated_as_unverified(self):
        claims = firebase_claims("nobody@t.co", verified=False)
        del claims["email_verified"]
        res = self._post(claims)
        self.assertEqual(res.status_code, 400)

    def test_verified_google_sign_in_still_works(self):
        res = self._post(firebase_claims("new@t.co", verified=True, provider="google.com"))

        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        user = User.objects.get(email="new@t.co")
        self.assertTrue(user.email_verified)
        self.assertEqual(user.google_uid, "fb-uid-1")

    def test_verified_sign_in_links_to_an_existing_account(self):
        existing = make_user("existing@t.co")
        res = self._post(firebase_claims("existing@t.co", verified=True, provider="google.com"))

        self.assertEqual(res.status_code, 200)
        existing.refresh_from_db()
        self.assertEqual(existing.google_uid, "fb-uid-1")

    def test_verifier_internals_are_not_returned_to_the_caller(self):
        with patch("firebase_admin.auth.verify_id_token", side_effect=ValueError("secret internals")), \
             patch("apps.users.firebase_init.get_firebase_app", return_value=None):
            res = self.client.post(self.URL, {"id_token": "bad"}, format="json")

        self.assertEqual(res.status_code, 400)
        self.assertNotIn("secret internals", res.json()["detail"])


# ─── OTP send throttling ─────────────────────────────────────────────────────

class OTPRateLimitTests(TestCase):
    """
    /api/auth/send-otp/ is AllowAny and creates a User row for any address it is
    given, so a per-IP cap is what stops one caller minting accounts and mailing
    strangers from our domain. The per-email cap alone never fires against a
    caller who uses a different address every time.
    """

    URL = "/api/auth/send-otp/"

    def setUp(self):
        self.client = APIClient()

    def _send(self, email, ip="203.0.113.9", **extra):
        with patch("apps.users.views.send_otp_email_now") as sender:
            res = self.client.post(self.URL, {"email": email}, format="json",
                                   REMOTE_ADDR=ip, **extra)
        return res, sender.call_count

    @patch("apps.users.utils._get_redis")
    def test_ip_limit_stops_walking_a_list_of_addresses(self, redis_mock):
        # Per-email counters never trip (a new address each time); the per-IP
        # counter is over its limit, so nothing is sent.
        redis_mock.return_value.get.side_effect = (
            lambda key: b"99" if key.startswith("otp_ip_rate:") else None
        )

        res, sent = self._send("stranger1@t.co")
        self.assertEqual(res.status_code, 200)          # still 200 no enumeration signal
        self.assertEqual(sent, 0)                       # but no mail went out
        self.assertFalse(User.objects.filter(email="stranger1@t.co").exists())

    @patch("apps.users.utils._get_redis")
    def test_send_proceeds_when_under_both_limits(self, redis_mock):
        redis_mock.return_value.get.return_value = None

        res, sent = self._send("newcomer@t.co")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(sent, 1)
        self.assertTrue(User.objects.filter(email="newcomer@t.co").exists())

    @patch("apps.users.utils._get_redis")
    def test_both_counters_are_incremented_on_a_successful_send(self, redis_mock):
        redis_mock.return_value.get.return_value = None
        pipe = redis_mock.return_value.pipeline.return_value

        self._send("counted@t.co")

        keys = [c.args[0] for c in pipe.incr.call_args_list]
        self.assertTrue(any(k.startswith("otp_rate:")    for k in keys), keys)
        self.assertTrue(any(k.startswith("otp_ip_rate:") for k in keys), keys)

    @patch("apps.users.utils._get_redis")
    def test_redis_outage_fails_open(self, redis_mock):
        import redis as redis_lib
        redis_mock.side_effect = redis_lib.ConnectionError("down")

        res, sent = self._send("resilient@t.co")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(sent, 1)      # sign-in keeps working without Redis


class ClientIPTests(TestCase):
    """
    X-Forwarded-For is caller-controlled. Honouring it without a trusted proxy in
    front would let anyone reset their own per-IP counter every request.
    """

    def _ip(self, **meta):
        from apps.users.utils import get_client_ip

        class Req:
            META = {"REMOTE_ADDR": "198.51.100.7", **meta}

        return get_client_ip(Req())

    def test_forwarded_header_is_ignored_by_default(self):
        self.assertEqual(
            self._ip(HTTP_X_FORWARDED_FOR="1.2.3.4"), "198.51.100.7",
        )

    @override_settings(TRUST_PROXY_HEADERS=True)
    def test_forwarded_header_is_used_behind_a_trusted_proxy(self):
        self.assertEqual(
            self._ip(HTTP_X_FORWARDED_FOR="1.2.3.4, 10.0.0.1"), "1.2.3.4",
        )

    @override_settings(TRUST_PROXY_HEADERS=True)
    def test_falls_back_to_remote_addr_when_header_absent(self):
        self.assertEqual(self._ip(), "198.51.100.7")


# ─── Deleted accounts must not be resurrected with a broken session ──────────

class DeletedAccountSignInTests(TestCase):
    """
    AccountDeleteView only sets is_active=False. Every sign-in path has to
    reactivate, because JWTAuthentication rejects an inactive user: minting
    tokens without reactivating hands back a session that 401s immediately.
    """

    def setUp(self):
        self.client = APIClient()

    def _deleted_user(self, email="gone@t.co"):
        user = make_user(email)
        user.first_name          = "Old"
        user.avatar_url          = "https://cdn/old.jpg"
        user.onboarding_complete = True
        user.is_active           = False
        user.username            = None          # deletion frees the username
        user.save()
        return user

    def _assert_usable_session(self, res):
        """The returned access token must actually work on an authed endpoint."""
        self.assertEqual(res.status_code, 200)
        token = res.json()["access"]
        me = self.client.get("/api/users/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(me.status_code, 200, "token was issued but is unusable")

    def test_firebase_sign_in_reactivates(self):
        user = self._deleted_user()
        with patch("firebase_admin.auth.verify_id_token",
                   return_value=firebase_claims("gone@t.co", True, "google.com")), \
             patch("apps.users.firebase_init.get_firebase_app", return_value=None):
            res = self.client.post("/api/auth/firebase/", {"id_token": "s"}, format="json")

        self._assert_usable_session(res)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertIsNone(user.deleted_at)
        self.assertIsNotNone(user.username)          # regenerated

    def test_reactivation_does_not_restore_the_old_profile(self):
        user = self._deleted_user()
        with patch("firebase_admin.auth.verify_id_token",
                   return_value=firebase_claims("gone@t.co", True, "google.com")), \
             patch("apps.users.firebase_init.get_firebase_app", return_value=None):
            self.client.post("/api/auth/firebase/", {"id_token": "s"}, format="json")

        user.refresh_from_db()
        self.assertIsNone(user.avatar_url)
        self.assertFalse(user.onboarding_complete)   # sent back through onboarding

    def test_google_sign_in_reactivates(self):
        user = self._deleted_user()
        payload = {"email": "gone@t.co", "sub": "g-1",
                   "email_verified": "true", "aud": "client-id"}
        with override_settings(SOCIAL_AUTH_GOOGLE_OAUTH2_KEY="client-id"), \
             patch("apps.users.views._verify_google_token", return_value=payload):
            res = self.client.post("/api/auth/google/", {"id_token": "s"}, format="json")

        self._assert_usable_session(res)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_otp_verify_reactivates(self):
        from django.utils import timezone
        from datetime import timedelta
        from apps.users.models import EmailVerification
        from apps.users.utils import hash_otp

        user = self._deleted_user()
        EmailVerification.objects.create(
            user=user, code=hash_otp("123456"),
            purpose=EmailVerification.Purpose.LOGIN,
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        res = self.client.post("/api/auth/verify-otp/",
                               {"email": "gone@t.co", "code": "123456"}, format="json")
        self._assert_usable_session(res)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
