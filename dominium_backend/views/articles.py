import json
import os
import re
from io import BytesIO
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods
from PIL import Image, UnidentifiedImageError

from house.models import Article, ArticleImage
from house.utils.network_security import (
    ImportContentTypeError,
    ImportPayloadTooLargeError,
    UnsafeImportURLError,
    ensure_safe_import_url,
    fetch_remote_content,
)


IMPORT_FIELDS = {
    "title", "slug", "summary", "body", "seo_title", "seo_description",
    "is_published", "cover_image_url", "images",
}
HTML_PATTERN = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")


def _serialize(article, request):
    cover_url = (
        request.build_absolute_uri(article.cover_image.url)
        if article.cover_image
        else ""
    )
    return {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "summary": article.summary,
        "body": article.body,
        "cover_image_url": cover_url,
        "images": [_serialize_image(item, request) for item in article.images.all()],
        "seo_title": article.seo_title,
        "seo_description": article.seo_description,
        "is_published": article.is_published,
        "published_at": (
            article.published_at.isoformat() if article.published_at else None
        ),
        "created_at": article.created_at.isoformat(),
        "updated_at": article.updated_at.isoformat(),
        "absolute_url": request.build_absolute_uri(article.get_absolute_url()),
    }


def _serialize_image(image, request):
    return {
        "id": image.id,
        "url": request.build_absolute_uri(image.image.url),
        "alt_text": image.alt_text,
        "caption": image.caption,
        "sort_order": image.sort_order,
    }


def _staff_required(request):
    return bool(request.user.is_authenticated and request.user.is_staff)


def _request_data(request):
    if request.content_type == "application/json":
        try:
            return json.loads(request.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
    return request.POST.dict()


def _validate_image(upload):
    if not upload:
        return "Файл зображення відсутній."
    extension = os.path.splitext(str(upload.name).lower())[1]
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return "Підтримуються JPG, PNG, WebP або GIF."
    if getattr(upload, "size", 0) > settings.ADMIN_IMAGE_MAX_BYTES:
        return "Зображення перевищує дозволений розмір."
    if str(getattr(upload, "content_type", "")).lower() == "image/svg+xml":
        return "SVG-зображення не підтримуються."
    try:
        upload.seek(0)
        with Image.open(upload) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        return "Файл пошкоджений або не є зображенням."
    finally:
        upload.seek(0)
    return None


def _validate_import_media(data):
    errors = {}
    cover_url = str(data.get("cover_image_url") or "").strip()
    raw_images = data.get("images", [])
    if not isinstance(raw_images, list):
        return None, {"images": "Поле images має бути списком."}
    if len(raw_images) > settings.ARTICLE_IMPORT_MAX_IMAGES:
        return None, {"images": f"Дозволено не більше {settings.ARTICLE_IMPORT_MAX_IMAGES} фото."}

    media = {"cover_image_url": cover_url, "images": []}
    candidates = [("cover_image_url", cover_url)] if cover_url else []
    for index, item in enumerate(raw_images):
        if not isinstance(item, dict) or set(item) - {"url", "alt_text", "caption"}:
            errors["images"] = f"Фото #{index + 1} має некоректну структуру."
            continue
        url = str(item.get("url") or "").strip()
        media["images"].append({
            "url": url,
            "alt_text": str(item.get("alt_text") or "").strip()[:200],
            "caption": str(item.get("caption") or "").strip()[:500],
        })
        candidates.append((f"images[{index}].url", url))

    for field, url in candidates:
        if not url:
            errors[field] = "Додайте пряме HTTPS-посилання на зображення."
            continue
        if urlparse(url).scheme.lower() != "https":
            errors[field] = "Дозволені лише HTTPS-посилання."
            continue
        try:
            ensure_safe_import_url(url, url_kind="image")
        except UnsafeImportURLError:
            errors[field] = "Посилання веде на недозволену або локальну адресу."
    return media, errors


def _import_payload(request):
    if request.content_type != "application/json":
        return None, None, JsonResponse({"errors": {"body": "Очікується JSON."}}, status=400)
    if len(request.body) > settings.ARTICLE_IMPORT_MAX_BYTES:
        return None, None, JsonResponse({"error": "payload_too_large"}, status=413)
    data = _request_data(request)
    if not isinstance(data, dict):
        return None, None, JsonResponse({"errors": {"body": "Некоректний JSON."}}, status=400)
    unknown = sorted(set(data) - IMPORT_FIELDS)
    if unknown:
        return None, None, JsonResponse({"errors": {"fields": "Невідомі поля: " + ", ".join(unknown)}}, status=400)
    article = Article(is_published=False)
    errors = _apply(article, data)
    media, media_errors = _validate_import_media(data)
    errors.update(media_errors)
    article.is_published = False
    article.published_at = None
    for field in ("title", "summary", "body", "seo_title", "seo_description"):
        if HTML_PATTERN.search(str(getattr(article, field, ""))):
            errors[field] = "HTML не підтримується. Використайте звичайний текст."
    try:
        article.full_clean(validate_unique=False)
    except ValidationError as exc:
        for field, messages in exc.message_dict.items():
            errors[field] = " ".join(messages)
    if Article.objects.filter(slug=article.slug).exists():
        errors["slug"] = "Такий slug уже існує."
    if errors:
        return None, None, JsonResponse({"errors": errors}, status=400)
    return article, media, None


def _download_import_image(url, filename_prefix):
    raw, content_type, final_url = fetch_remote_content(
        url,
        timeout=settings.ARTICLE_IMPORT_IMAGE_TIMEOUT,
        max_bytes=settings.ADMIN_IMAGE_MAX_BYTES,
        allowed_content_types=("image/jpeg", "image/png", "image/webp", "image/gif"),
        accept_header="image/jpeg,image/png,image/webp,image/gif",
        url_kind="image",
    )
    with Image.open(BytesIO(raw)) as image:
        image.verify()
        image_format = (image.format or "").lower()
    extension = {"jpeg": ".jpg", "png": ".png", "webp": ".webp", "gif": ".gif"}.get(image_format)
    if not extension:
        raise UnidentifiedImageError("Unsupported image format")
    upload = ContentFile(raw, name=f"{filename_prefix}{extension}")
    upload.content_type = content_type.split(";", 1)[0]
    validation_error = _validate_image(upload)
    if validation_error:
        raise UnidentifiedImageError(validation_error)
    return upload, final_url


def _download_import_media(media):
    downloaded = {"cover": None, "images": []}
    try:
        if media["cover_image_url"]:
            downloaded["cover"], _ = _download_import_image(media["cover_image_url"], "cover")
        for index, item in enumerate(media["images"]):
            upload, _ = _download_import_image(item["url"], f"image-{index + 1}")
            downloaded["images"].append((upload, item))
    except (
        requests.RequestException, UnsafeImportURLError, ImportPayloadTooLargeError,
        ImportContentTypeError, UnidentifiedImageError, OSError, ValueError,
    ):
        return None, "Не вдалося безпечно завантажити одне із зображень. Перевірте прямі HTTPS-посилання."
    return downloaded, None


def _apply(article, data, *, partial=False):
    required = ("title", "slug", "summary", "body")
    errors = {}
    for field in required:
        if not partial and not str(data.get(field, "")).strip():
            errors[field] = "Обовʼязкове поле."
    if errors:
        return errors
    for field in (*required, "seo_title", "seo_description"):
        if field in data:
            value = str(data[field]).strip()
            if field in required and not value:
                errors[field] = "Обовʼязкове поле."
            setattr(article, field, value)
    if "is_published" in data:
        value = data["is_published"]
        article.is_published = value is True or str(value).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
    return errors


def _save(article):
    try:
        article.full_clean()
        article.save()
    except ValidationError as exc:
        return {
            field: " ".join(messages)
            for field, messages in exc.message_dict.items()
        }
    except IntegrityError:
        return {"slug": "Такий slug уже існує."}
    return {}


@require_GET
def article_list_api(request):
    articles = Article.objects.filter(is_published=True)
    return JsonResponse(
        {"results": [_serialize(item, request) for item in articles]}
    )


@require_GET
def article_detail_api(request, slug):
    article = get_object_or_404(Article, slug=slug, is_published=True)
    return JsonResponse({"result": _serialize(article, request)})


@require_http_methods(["GET", "POST"])
def article_admin_collection(request):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    if request.method == "GET":
        return JsonResponse(
            {"results": [_serialize(item, request) for item in Article.objects.all()]}
        )
    data = _request_data(request)
    if data is None:
        return JsonResponse({"errors": {"body": "Некоректний JSON."}}, status=400)
    article = Article()
    errors = _apply(article, data)
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    if request.FILES.get("cover_image"):
        cover_error = _validate_image(request.FILES["cover_image"])
        if cover_error:
            return JsonResponse({"errors": {"cover_image": cover_error}}, status=400)
        article.cover_image = request.FILES["cover_image"]
    errors = _save(article)
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    return JsonResponse({"result": _serialize(article, request)}, status=201)


@require_http_methods(["GET", "PATCH", "POST"])
def article_admin_item(request, article_id):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    article = get_object_or_404(Article, pk=article_id)
    if request.method == "GET":
        return JsonResponse({"result": _serialize(article, request)})
    data = _request_data(request)
    if data is None:
        return JsonResponse({"errors": {"body": "Некоректний JSON."}}, status=400)
    errors = _apply(article, data, partial=True)
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    if request.FILES.get("cover_image"):
        cover_error = _validate_image(request.FILES["cover_image"])
        if cover_error:
            return JsonResponse({"errors": {"cover_image": cover_error}}, status=400)
        article.cover_image = request.FILES["cover_image"]
    errors = _save(article)
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    return JsonResponse({"result": _serialize(article, request)})


@require_http_methods(["POST"])
def article_import_preview(request):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    article, media, error = _import_payload(request)
    if error:
        return error
    return JsonResponse({"result": {
        "title": article.title, "slug": article.slug, "summary": article.summary,
        "body": article.body, "seo_title": article.seo_title,
        "seo_description": article.seo_description, "is_published": False,
        "cover_image_url": media["cover_image_url"], "images": media["images"],
    }})


@require_http_methods(["POST"])
def article_import(request):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    article, media, error = _import_payload(request)
    if error:
        return error
    downloaded, download_error = _download_import_media(media)
    if download_error:
        return JsonResponse({"errors": {"images": download_error}}, status=400)
    with transaction.atomic():
        if downloaded["cover"]:
            article.cover_image = downloaded["cover"]
        errors = _save(article)
        if errors:
            return JsonResponse({"errors": errors}, status=400)
        for index, (upload, item) in enumerate(downloaded["images"]):
            ArticleImage.objects.create(
                article=article,
                image=upload,
                alt_text=item["alt_text"],
                caption=item["caption"],
                sort_order=index,
            )
    return JsonResponse({"result": _serialize(article, request)}, status=201)


@require_http_methods(["GET", "POST"])
def article_admin_images(request, article_id):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    article = get_object_or_404(Article, pk=article_id)
    if request.method == "GET":
        return JsonResponse({"results": [_serialize_image(item, request) for item in article.images.all()]})
    uploads = request.FILES.getlist("images")
    if not uploads:
        return JsonResponse({"errors": {"images": "Оберіть хоча б одне фото."}}, status=400)
    if len(uploads) > settings.ADMIN_IMAGE_UPLOAD_MAX_FILES:
        return JsonResponse({"errors": {"images": "Забагато файлів."}}, status=400)
    validation = [_validate_image(upload) for upload in uploads]
    if any(validation):
        return JsonResponse({"errors": {"images": next(item for item in validation if item)}}, status=400)
    try:
        alt_texts = json.loads(request.POST.get("alt_texts", "[]"))
        captions = json.loads(request.POST.get("captions", "[]"))
    except json.JSONDecodeError:
        return JsonResponse({"errors": {"images": "Некоректні описи фото."}}, status=400)
    if not isinstance(alt_texts, list) or not isinstance(captions, list):
        return JsonResponse({"errors": {"images": "Описи фото мають бути списками."}}, status=400)
    start = article.images.count()
    created = []
    for index, upload in enumerate(uploads):
        created.append(ArticleImage.objects.create(
            article=article, image=upload,
            alt_text=str(alt_texts[index] if index < len(alt_texts) else "")[:200],
            caption=str(captions[index] if index < len(captions) else "")[:500],
            sort_order=start + index,
        ))
    return JsonResponse({"results": [_serialize_image(item, request) for item in created]}, status=201)


@require_http_methods(["PATCH", "DELETE"])
def article_admin_image_item(request, image_id):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    image = get_object_or_404(ArticleImage, pk=image_id)
    if request.method == "DELETE":
        image.delete()
        return HttpResponse(status=204)
    data = _request_data(request)
    if not isinstance(data, dict):
        return JsonResponse({"error": "invalid_json"}, status=400)
    if "alt_text" in data:
        image.alt_text = str(data["alt_text"]).strip()[:200]
    if "caption" in data:
        image.caption = str(data["caption"]).strip()[:500]
    image.save(update_fields=["alt_text", "caption"])
    return JsonResponse({"result": _serialize_image(image, request)})


@require_http_methods(["POST"])
def article_admin_images_order(request, article_id):
    if not _staff_required(request):
        return JsonResponse({"error": "forbidden"}, status=403)
    article = get_object_or_404(Article, pk=article_id)
    data = _request_data(request)
    ids = data.get("ids") if isinstance(data, dict) else None
    existing = list(article.images.values_list("id", flat=True))
    if not isinstance(ids, list) or set(ids) != set(existing) or len(ids) != len(existing):
        return JsonResponse({"errors": {"ids": "Передайте всі ID фото без дублікатів."}}, status=400)
    with transaction.atomic():
        for index, image_id in enumerate(ids):
            ArticleImage.objects.filter(pk=image_id, article=article).update(sort_order=index)
    article.refresh_from_db()
    return JsonResponse({"results": [_serialize_image(item, request) for item in article.images.all()]})
