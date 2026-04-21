import os
from io import BytesIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from PIL import Image, ImageOps
from django.conf import settings


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _use_r2() -> bool:
    return bool(getattr(settings, "USE_R2", False))


def _r2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def _r2_url(key: str) -> str:
    domain = getattr(settings, "R2_PUBLIC_DOMAIN", "").rstrip("/")
    if domain:
        if not domain.startswith("http"):
            domain = f"https://{domain}"
        return f"{domain}/{key}"
    return f"{settings.R2_ENDPOINT_URL}/{settings.R2_BUCKET_NAME}/{key}"


# ─── Public API ───────────────────────────────────────────────────────────────

def save_file(file, key: str, request=None) -> str:
    """
    Save an uploaded file as-is (no image processing).
    Use for audio, video, and other non-image binary files.
    Returns an absolute URL.
    """
    if _use_r2():
        client = _r2_client()
        file.seek(0)
        client.upload_fileobj(
            file,
            settings.R2_BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": getattr(file, "content_type", "application/octet-stream")},
        )
        return _r2_url(key)

    path = os.path.join(settings.MEDIA_ROOT, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    if request:
        return request.build_absolute_uri(f"{settings.MEDIA_URL}{key}")
    return f"{settings.MEDIA_URL}{key}"


def save_image(file, key: str, max_px: int = 1600, request=None) -> str:
    """
    Strip EXIF metadata, fix orientation, resize if larger than max_px,
    and save as JPEG. Returns an absolute URL.

    Use this for all user-uploaded photos (avatars, trip covers, chat images).
    The .jpg extension should already be in `key` before calling this.
    """
    img = Image.open(file)
    img = ImageOps.exif_transpose(img)          # fix orientation from EXIF
    if img.mode not in ("RGB",):
        img = img.convert("RGB")                # flatten RGBA/palette/LA to RGB
    if max(img.size) > max_px:
        img.thumbnail((max_px, max_px), Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    buf.seek(0)

    if _use_r2():
        client = _r2_client()
        client.upload_fileobj(
            buf,
            settings.R2_BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": "image/jpeg"},
        )
        return _r2_url(key)

    path = os.path.join(settings.MEDIA_ROOT, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as dest:
        dest.write(buf.read())
    if request:
        return request.build_absolute_uri(f"{settings.MEDIA_URL}{key}")
    return f"{settings.MEDIA_URL}{key}"


def delete_file(key: str) -> None:
    """Delete a file from R2 or the local media folder. Silently ignores missing files."""
    if not key:
        return
    if _use_r2():
        try:
            _r2_client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
        except (BotoCoreError, ClientError):
            pass
        return
    try:
        path = os.path.join(settings.MEDIA_ROOT, key)
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
