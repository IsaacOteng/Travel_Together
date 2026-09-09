"""
Account deletion and re-signup
------------------------------
Deleting an account used to keep the row and flip `is_active=False`, so the
next sign-in on that address found the *same* row and simply switched it back
on. Clearing a few profile columns on the way through was never enough: every
row that points at a user id notifications, chat memberships, trip
memberships, karma, badges came back with it, because the id never changed.
The account looked new and behaved like the old one.

So deletion now *retires* the row instead. The tombstone keeps its id (so other
people's trips, chats and payment records still resolve), but gives up every
identifier it was found by email, username, google_uid, apple_uid and is
stripped of personal data. The address is free, so the next sign-in creates a
genuinely new user with a new id and nothing attached to it.

Money is the one thing that must survive: a debt the user owes us can't be
erased by deleting the account and signing up again on the same address, so
`retired_email` records where the tombstone came from and any outstanding
clawback/probation is carried onto the replacement.
"""

import uuid

from django.db import transaction
from django.utils import timezone

from apps.users.models import (
    EmailVerification,
    EmergencyContact,
    NotificationSettings,
    User,
    UserLocation,
    UserPreferences,
)
from apps.users.utils import generate_unique_username


def is_retired(user: User) -> bool:
    """
    True when this row is a deleted account rather than a usable one.

    Deactivation (`deactivated_at`) is deliberately reversible and must not be
    caught here only deletion is. `is_active=False` on its own is treated as
    deletion because that is all older deletions left behind.
    """
    if user.deleted_at is not None:
        return True
    return not user.is_active and user.deactivated_at is None


@transaction.atomic
def retire_account(user: User) -> None:
    """
    Turn `user` into an anonymous tombstone: identifiers released, PII gone.

    The row survives so that records belonging to *other* people (group
    messages they received, trips they joined, payouts already made) keep
    resolving. Celery hard-deletes it once the grace period is up.
    """
    user.retired_email = user.retired_email or user.email
    user.email         = f"deleted+{uuid.uuid4().hex}@deleted.invalid"
    user.username      = None
    user.google_uid    = None
    user.apple_uid     = None

    user.first_name    = None
    user.last_name     = None
    user.date_of_birth = None
    user.gender        = None
    user.nationality   = None
    user.city          = None
    user.country       = None
    user.dial_code     = None
    user.phone_number  = None
    user.bio           = None
    user.avatar_url    = None
    user.cover_url     = None

    user.email_verified        = False
    user.is_verified_traveller = False
    user.two_factor_enabled    = False
    user.onboarding_complete   = False
    user.is_active             = False
    user.deleted_at            = user.deleted_at or timezone.now()
    user.save()

    # Personal-only rows: nothing else in the app reads these, so they go now
    # rather than waiting for the 30-day purge.
    EmergencyContact.objects.filter(user=user).delete()
    UserLocation.objects.filter(user=user).delete()
    EmailVerification.objects.filter(user=user).delete()
    NotificationSettings.objects.filter(user=user).delete()
    UserPreferences.objects.filter(user=user).delete()
    user.notifications.all().delete()
    user.saved_trips.all().delete()
    user.conversations.all().delete()      # chat membership; messages stay put
    user.read_receipts.all().delete()


def carry_over_retired_debt(user: User) -> User:
    """
    Re-attach what a retired account on this address still owed us.

    Deletion frees the address, so a brand-new row is the only thing a returning
    user gets and without this that is also how they'd shed a clawback: delete,
    sign up again, start from zero. `retired_email` is the only remaining link
    back, so every path that creates an account has to walk it.
    """
    tombstone = (
        User.objects.filter(retired_email=user.email)
        .exclude(pk=user.pk)
        .order_by("-deleted_at")
        .first()
    )
    if tombstone is None:
        return user

    fields = []
    if tombstone.clawback_owed and tombstone.clawback_owed > user.clawback_owed:
        user.clawback_owed = tombstone.clawback_owed
        fields.append("clawback_owed")
    if tombstone.payout_probation_until and not user.payout_probation_until:
        user.payout_probation_until = tombstone.payout_probation_until
        fields.append("payout_probation_until")
    if fields:
        user.save(update_fields=fields)
    return user


@transaction.atomic
def fresh_account_if_retired(user: User) -> User:
    """
    Hand back a clean account when a sign-in lands on a deleted one.

    Returns `user` untouched if it is still live; otherwise retires it and
    returns a brand-new row on the same address, carrying over only what the
    old account owed.
    """
    if not is_retired(user):
        return user

    email = user.retired_email or user.email
    retire_account(user)

    return carry_over_retired_debt(User.objects.create_user(
        email=email,
        is_active=True,
        username=generate_unique_username(email),
    ))
