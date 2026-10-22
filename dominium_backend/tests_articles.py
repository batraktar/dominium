import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from house.models import Article


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
