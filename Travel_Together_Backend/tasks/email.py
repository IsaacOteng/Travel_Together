from celery import shared_task
from django.core.mail import send_mail


_SUBJECTS = {
    "login":          "Your TravelTogether login code",
    "delete_account": "Confirm your TravelTogether account deletion",
    "deactivate":     "Confirm your TravelTogether account deactivation",
    "email_change":   "Confirm your TravelTogether email change",
}

_BODIES = {
    "login": (
        "Hi,\n\n"
        "Your TravelTogether login code is:\n\n"
        "    {code}\n\n"
        "This code expires in 15 minutes. Do not share it with anyone.\n\n"
        "If you didn't request this, you can safely ignore this email.\n\n"
        "— The TravelTogether Team"
    ),
    "delete_account": (
        "Hi,\n\n"
        "We received a request to permanently delete your TravelTogether account.\n\n"
        "Your confirmation code is:\n\n"
        "    {code}\n\n"
        "This code expires in 15 minutes. If you did not request this, "
        "please ignore this email — your account is safe.\n\n"
        "— The TravelTogether Team"
    ),
    "deactivate": (
        "Hi,\n\n"
        "Your account deactivation confirmation code is:\n\n"
        "    {code}\n\n"
        "This code expires in 15 minutes.\n\n"
        "— The TravelTogether Team"
    ),
    "email_change": (
        "Hi,\n\n"
        "Your email change confirmation code is:\n\n"
        "    {code}\n\n"
        "This code expires in 15 minutes.\n\n"
        "— The TravelTogether Team"
    ),
}


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email(self, email: str, code: str, purpose: str) -> None:
    """
    Send a purpose-specific OTP email.
    Retried up to 3 times with a 30-second delay on failure.
    """
    subject = _SUBJECTS.get(purpose, "Your TravelTogether verification code")
    body    = _BODIES.get(purpose, "Your verification code is: {code}\n\nExpires in 15 minutes.")
    message = body.format(code=code)

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=None,   # uses DEFAULT_FROM_EMAIL from settings
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
