import json

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods

from house.models import Article


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


def _staff_required(request):
    return bool(request.user.is_authenticated and request.user.is_staff)


def _request_data(request):
    if request.content_type == "application/json":
        try:
            return json.loads(request.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
    return request.POST.dict()


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
        article.cover_image = request.FILES["cover_image"]
    errors = _save(article)
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    return JsonResponse({"result": _serialize(article, request)})
