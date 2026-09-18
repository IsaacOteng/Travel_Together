import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from apps.users.models import User
for u in User.objects.all().order_by("email"):
    print(f"  is_staff={str(u.is_staff):5} active={str(u.is_active):5} {u.email}")
