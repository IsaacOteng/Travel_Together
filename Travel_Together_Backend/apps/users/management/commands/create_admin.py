from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.users.models import User


class Command(BaseCommand):
    help = "Create or promote a superuser (is_staff + is_active) for the admin dashboard."

    def add_arguments(self, parser):
        parser.add_argument("--email",    required=True,  help="Admin email address")
        parser.add_argument("--username", default=None,   help="Username (optional)")
        parser.add_argument("--password", default=None,   help="Password — only needed for Django's built-in /admin/ panel")

    def handle(self, *args, **options):
        email    = options["email"].strip().lower()
        username = options.get("username")
        password = options.get("password")

        if not email:
            raise CommandError("--email is required.")

        with transaction.atomic():
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "is_staff":            True,
                    "is_active":           True,
                    "email_verified":      True,
                    "onboarding_complete": True,
                    "username":            username,
                },
            )

            if not created:
                # Promote existing user
                user.is_staff            = True
                user.is_active           = True
                user.email_verified      = True
                user.onboarding_complete = True
                if username and not user.username:
                    user.username = username
                user.save()

            if password:
                user.set_password(password)
                user.save()
            else:
                # Passwordless — unusable password is fine for OTP-based login
                if created:
                    user.set_unusable_password()
                    user.save()

        action = "Created" if created else "Promoted"
        self.stdout.write(self.style.SUCCESS(
            f"{action} admin: {email} (is_staff=True, is_active=True)"
        ))
        if not password:
            self.stdout.write(self.style.WARNING(
                "No password set — log in via OTP or Google on the frontend, then go to /admin."
            ))
