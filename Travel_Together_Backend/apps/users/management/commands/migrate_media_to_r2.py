import mimetypes
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from utils.storage import _r2_client, _r2_url


# Every model field that stores a media URL, as (model, [field names]).
# Kept as strings so the command does not import apps it may not need.
URL_FIELDS = [
    ("users.User",           ["avatar_url", "cover_url"]),
    ("trips.Trip",           ["cover_url"]),
    ("trips.TripImage",      ["image_url"]),
    ("chat.Conversation",    ["cover_url"]),
    ("chat.Message",         ["media_url"]),
    ("streaks.StreakVideo",  ["video_url", "thumbnail_url"]),
]


def _key_from_url(url: str) -> str | None:
    """
    Return the storage key for a URL that points at the local media folder,
    or None if the URL is not a local-media URL.

    'http://localhost:8000/media/avatars/ab.jpg' -> 'avatars/ab.jpg'
    '/media/avatars/ab.jpg'                      -> 'avatars/ab.jpg'
    """
    if not url:
        return None
    marker = settings.MEDIA_URL if settings.MEDIA_URL.startswith("/") else "/media/"
    idx = url.find(marker)
    if idx == -1:
        return None
    return url[idx + len(marker):].lstrip("/") or None


class Command(BaseCommand):
    help = (
        "Upload everything in MEDIA_ROOT to Cloudflare R2 and rewrite the media "
        "URLs stored in the database to their R2 equivalents. Fixes avatars and "
        "photos uploaded before USE_R2 was turned on, which 404 once local media "
        "is no longer served."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Show what would be uploaded and rewritten without changing anything.",
        )
        parser.add_argument(
            "--skip-upload", action="store_true",
            help="Only rewrite database URLs; assume the objects already exist in R2.",
        )

    def handle(self, *args, **options):
        if not settings.USE_R2:
            raise CommandError("USE_R2 is False — set it to True (and fill in the R2_* vars) first.")
        for name in ("R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT_URL"):
            if not getattr(settings, name, ""):
                raise CommandError(f"{name} is not set.")

        dry     = options["dry_run"]
        client  = _r2_client()
        bucket  = settings.R2_BUCKET_NAME

        # ── 1. Upload local files ────────────────────────────────────────────
        uploaded = skipped = 0
        if options["skip_upload"]:
            self.stdout.write("Skipping upload step.")
        elif not os.path.isdir(settings.MEDIA_ROOT):
            self.stdout.write(f"No local media folder at {settings.MEDIA_ROOT} — nothing to upload.")
        else:
            for root, _dirs, files in os.walk(settings.MEDIA_ROOT):
                for filename in files:
                    path = os.path.join(root, filename)
                    key  = os.path.relpath(path, settings.MEDIA_ROOT).replace(os.sep, "/")

                    try:
                        client.head_object(Bucket=bucket, Key=key)
                        skipped += 1
                        continue                      # already in R2, leave it alone
                    except Exception:
                        pass

                    if dry:
                        self.stdout.write(f"  would upload {key}")
                        uploaded += 1
                        continue

                    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
                    with open(path, "rb") as fh:
                        client.upload_fileobj(
                            fh, bucket, key, ExtraArgs={"ContentType": content_type}
                        )
                    uploaded += 1
                    self.stdout.write(f"  uploaded {key}")

        self.stdout.write(self.style.SUCCESS(
            f"Files: {uploaded} uploaded, {skipped} already in R2."
        ))

        # ── 2. Rewrite stored URLs ───────────────────────────────────────────
        from django.apps import apps as django_apps

        rewritten = 0
        for label, fields in URL_FIELDS:
            try:
                model = django_apps.get_model(label)
            except LookupError:
                continue

            for obj in model.objects.all().iterator():
                changed = []
                for field in fields:
                    key = _key_from_url(getattr(obj, field, None))
                    if not key:
                        continue
                    setattr(obj, field, _r2_url(key))
                    changed.append(field)
                if not changed:
                    continue
                rewritten += 1
                self.stdout.write(
                    f"  {label} #{obj.pk}: " +
                    ", ".join(f"{f} -> {getattr(obj, f)}" for f in changed)
                )
                if not dry:
                    obj.save(update_fields=changed)

        self.stdout.write(self.style.SUCCESS(f"Rows rewritten: {rewritten}"))
        if dry:
            self.stdout.write(self.style.WARNING("Dry run — nothing was changed."))
