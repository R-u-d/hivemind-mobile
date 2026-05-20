import logging
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
PRESIGNED_URL_EXPIRY_SECONDS = 300

_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

_s3_client = None


class S3Error(Exception):
    """Raised when an S3 operation fails. Safe to surface to the view layer."""


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            region_name=settings.AWS_S3_REGION_NAME,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
    return _s3_client


def generate_avatar_presigned_url(user_id: str, content_type: str, file_size: int) -> dict:
    ext = _EXTENSIONS.get(content_type)
    if ext is None:
        raise S3Error("Unsupported content type.")

    user_id_str = str(user_id)
    if "/" in user_id_str or ".." in user_id_str:
        raise S3Error("Invalid user identifier.")

    key = f"avatars/{user_id_str}/{uuid.uuid4()}.{ext}"

    try:
        s3 = _get_s3_client()
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
                "ContentLength": file_size,
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY_SECONDS,
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Failed to generate avatar presigned URL")
        raise S3Error("Could not generate upload URL.") from exc

    public_url = (
        f"https://{settings.AWS_STORAGE_BUCKET_NAME}"
        f".s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{key}"
    )
    return {"upload_url": upload_url, "key": key, "public_url": public_url}
