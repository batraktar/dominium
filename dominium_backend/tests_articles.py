import json
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image

from house.models import Article, ArticleEvent, ArticleImage


class ArticlePublicationTests(TestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username="articles-staff",
            email="articles-staff@example.invalid",
            password="test-password",
            is_staff=True,
        )
        self.published = Article.objects.create(
            title="Опублікована стаття",
            slug="published-article",
            summary="Короткий опис",
            body="Безпечний текст статті",
            is_published=True,
        )
        self.draft = Article.objects.create(
            title="Чернетка",
            slug="draft-article",
            summary="Не для публіки",
            body="Приватний текст",
            is_published=False,
        )

    def test_public_api_and_pages_expose_only_published_articles(self):
        listing = self.client.get(reverse("article_list_api"))
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(
            [item["slug"] for item in listing.json()["results"]],
            [self.published.slug],
        )

        self.assertEqual(
            self.client.get(reverse("article_detail", args=[self.published.slug])).status_code,
            200,
        )
        self.assertEqual(
            self.client.get(reverse("article_detail", args=[self.draft.slug])).status_code,
            404,
        )

    def test_staff_can_create_edit_publish_and_unpublish_articles(self):
        self.client.force_login(self.staff)
        create = self.client.post(
            reverse("article_admin_collection"),
            data=json.dumps(
                {
                    "title": "Нова стаття",
                    "slug": "new-article",
                    "summary": "Опис",
                    "body": "Текст",
                    "seo_title": "SEO назва",
                    "seo_description": "SEO опис",
                    "is_published": False,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        article_id = create.json()["result"]["id"]

        publish = self.client.patch(
            reverse("article_admin_item", args=[article_id]),
            data=json.dumps({"is_published": True, "body": "Оновлений текст"}),
            content_type="application/json",
        )
        self.assertEqual(publish.status_code, 200, publish.content)
        self.assertTrue(publish.json()["result"]["is_published"])
        self.assertIsNotNone(publish.json()["result"]["published_at"])

        unpublish = self.client.patch(
            reverse("article_admin_item", args=[article_id]),
            data=json.dumps({"is_published": False}),
            content_type="application/json",
        )
        self.assertEqual(unpublish.status_code, 200, unpublish.content)
        self.assertFalse(unpublish.json()["result"]["is_published"])

    def test_article_admin_api_rejects_anonymous_and_non_staff_users(self):
        anonymous = self.client.get(reverse("article_admin_collection"))
        self.assertEqual(anonymous.status_code, 403)

        user = get_user_model().objects.create_user(
            username="articles-user",
            email="articles-user@example.invalid",
            password="test-password",
        )
        self.client.force_login(user)
        non_staff = self.client.get(reverse("article_admin_collection"))
        self.assertEqual(non_staff.status_code, 403)

    def test_article_journey_events_are_deduplicated_and_staff_can_report_them(self):
        payload = {
            "article_id": self.published.id,
            "session_id": "11111111-1111-4111-8111-111111111111",
            "event_type": "view",
            "target_path": f"/articles/{self.published.slug}/",
        }
        first = self.client.post(reverse("article_event"), json.dumps(payload), content_type="application/json")
        duplicate = self.client.post(reverse("article_event"), json.dumps(payload), content_type="application/json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(ArticleEvent.objects.count(), 1)

        self.client.force_login(self.staff)
        report = self.client.get(reverse("article_analytics"), {"period": 28})
        self.assertEqual(report.status_code, 200)
        row = next(item for item in report.json()["results"] if item["id"] == self.published.id)
        self.assertEqual(row["views"], 1)
        self.assertEqual(row["visitors"], 1)

    def test_article_analytics_is_staff_only_and_events_require_published_article(self):
        self.assertEqual(self.client.get(reverse("article_analytics")).status_code, 403)
        response = self.client.post(reverse("article_event"), json.dumps({
            "article_id": self.draft.id,
            "session_id": "22222222-2222-4222-8222-222222222222",
            "event_type": "view",
        }), content_type="application/json")
        self.assertEqual(response.status_code, 404)

    def test_drafts_do_not_leak_into_sitemap_and_public_pages_have_correct_robots(self):
        sitemap = self.client.get(reverse("sitemap"))
        content = sitemap.content.decode()
        self.assertIn("/articles/", content)
        self.assertIn("/articles/published-article/", content)
        self.assertNotIn("draft-article", content)

        published = self.client.get(reverse("article_detail", args=[self.published.slug]))
        self.assertContains(published, 'name="robots" content="index, follow')
        detail = self.client.get(reverse("article_detail_api", args=[self.published.slug]))
        self.assertEqual(detail.json()["result"]["body"], "Безпечний текст статті")

    def test_staff_uploads_orders_and_deletes_article_images(self):
        self.client.force_login(self.staff)
        upload = self.client.post(
            reverse("article_admin_images", args=[self.published.id]),
            data={
                "images": [self._image("second.png"), self._image("first.png")],
                "alt_texts": json.dumps(["Друге фото", "Перше фото"]),
                "captions": json.dumps(["Підпис 2", "Підпис 1"]),
            },
        )
        self.assertEqual(upload.status_code, 201, upload.content)
        images = upload.json()["results"]
        self.assertEqual([item["sort_order"] for item in images], [0, 1])
        self.assertEqual(images[0]["alt_text"], "Друге фото")

        reorder = self.client.post(
            reverse("article_admin_images_order", args=[self.published.id]),
            data=json.dumps({"ids": [images[1]["id"], images[0]["id"]]}),
            content_type="application/json",
        )
        self.assertEqual(reorder.status_code, 200, reorder.content)
        public = self.client.get(reverse("article_detail_api", args=[self.published.slug]))
        self.assertEqual(
            [item["alt_text"] for item in public.json()["result"]["images"]],
            ["Перше фото", "Друге фото"],
        )

        deleted = self.client.delete(
            reverse("article_admin_image_item", args=[images[0]["id"]])
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(ArticleImage.objects.filter(article=self.published).count(), 1)

    def test_article_image_upload_rejects_invalid_content_and_non_staff(self):
        self.client.force_login(self.staff)
        invalid = self.client.post(
            reverse("article_admin_images", args=[self.published.id]),
            data={"images": SimpleUploadedFile("fake.jpg", b"not an image", content_type="image/jpeg")},
        )
        self.assertEqual(invalid.status_code, 400)
        self.client.logout()
        self.assertEqual(
            self.client.post(reverse("article_admin_images", args=[self.published.id])).status_code,
            403,
        )

    def test_article_cover_rejects_invalid_image_content(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("article_admin_collection"),
            data={
                "title": "Стаття", "slug": "bad-cover", "summary": "Опис", "body": "Текст",
                "cover_image": SimpleUploadedFile("fake.jpg", b"not-image", content_type="image/jpeg"),
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("cover_image", response.json()["errors"])

    def test_json_import_preview_and_save_are_strict_and_always_draft(self):
        self.client.force_login(self.staff)
        payload = {
            "title": "Імпортована стаття",
            "slug": "imported-article",
            "summary": "Коротко",
            "body": "Безпечний текст",
            "seo_title": "SEO",
            "seo_description": "Опис пошуку",
            "is_published": True,
        }
        preview = self.client.post(
            reverse("article_import_preview"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(preview.status_code, 200, preview.content)
        self.assertFalse(preview.json()["result"]["is_published"])
        self.assertFalse(Article.objects.filter(slug="imported-article").exists())

        saved = self.client.post(
            reverse("article_import"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(saved.status_code, 201, saved.content)
        article = Article.objects.get(slug="imported-article")
        self.assertFalse(article.is_published)

        duplicate = self.client.post(
            reverse("article_import"), data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(duplicate.status_code, 400)

    @patch("dominium_backend.views.articles.ensure_safe_import_url", side_effect=lambda url, **_: url)
    @patch("dominium_backend.views.articles.fetch_remote_content")
    def test_json_import_downloads_cover_and_gallery_images(self, fetch, _safe_url):
        self.client.force_login(self.staff)
        image = self._image("source.png")
        fetch.return_value = (image.read(), "image/png", "https://images.example/photo.png")
        payload = {
            "title": "Стаття з фото",
            "slug": "article-with-remote-images",
            "summary": "Коротко",
            "body": "Текст",
            "cover_image_url": "https://images.example/cover.png",
            "images": [{
                "url": "https://images.example/photo.png",
                "alt_text": "Будинок у місті",
                "caption": "Ілюстрація",
            }],
        }

        preview = self.client.post(
            reverse("article_import_preview"), data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(preview.status_code, 200, preview.content)
        self.assertEqual(fetch.call_count, 0)

        saved = self.client.post(
            reverse("article_import"), data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(saved.status_code, 201, saved.content)
        article = Article.objects.get(slug="article-with-remote-images")
        self.assertTrue(article.cover_image.name.endswith(".png"))
        self.assertEqual(article.images.count(), 1)
        self.assertEqual(article.images.get().alt_text, "Будинок у місті")
        self.assertEqual(fetch.call_count, 2)

    def test_json_import_rejects_insecure_or_malformed_image_links(self):
        self.client.force_login(self.staff)
        base = {"title": "Назва", "slug": "image-link-test", "summary": "Опис", "body": "Текст"}
        for media in (
            {"cover_image_url": "http://example.com/cover.jpg"},
            {"images": [{"url": "https://example.com/a.jpg", "unexpected": "value"}]},
            {"images": "https://example.com/a.jpg"},
        ):
            response = self.client.post(
                reverse("article_import_preview"),
                data=json.dumps({**base, **media}),
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400, response.content)

    def test_json_import_rejects_html_unknown_fields_and_oversized_payload(self):
        self.client.force_login(self.staff)
        base = {"title": "Назва", "slug": "safe-slug", "summary": "Опис", "body": "Текст"}
        for payload in (
            {**base, "body": "<script>alert(1)</script>"},
            {**base, "unexpected": "value"},
        ):
            response = self.client.post(
                reverse("article_import_preview"), data=json.dumps(payload), content_type="application/json"
            )
            self.assertEqual(response.status_code, 400, response.content)

        oversized = self.client.post(
            reverse("article_import_preview"),
            data=json.dumps({**base, "body": "x" * 210_000}),
            content_type="application/json",
        )
        self.assertEqual(oversized.status_code, 413)

    @staticmethod
    def _image(name):
        output = BytesIO()
        Image.new("RGB", (10, 10), color="green").save(output, format="PNG")
        return SimpleUploadedFile(name, output.getvalue(), content_type="image/png")
