import json
from unittest.mock import Mock, patch

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from accounts.models import CustomUser
from house.models import DealType, Property, PropertyType


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    TELEGRAM_BOT_TOKEN="dummy-token",
    TELEGRAM_CHAT_IDS=[123],
    CONSULTATION_RATE_LIMIT=1,
    CONSULTATION_RATE_WINDOW=60,
)
class ConsultationEndpointTest(TestCase):
    @patch("landing_doominium_real_state.views.public.requests.post")
    def test_consultation_ok_and_rate_limit(self, mock_post):
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        client = Client()
        payload = {
            "name": "Іван",
            "phone": "+380631112233",
            "email": "ivan@example.com",
            "message": "Хочу консультацію",
            "property": "https://example.com/property/1",
        }

        ok_response = client.post(reverse("consultation"), data=payload)
        self.assertEqual(ok_response.status_code, 200)
        self.assertEqual(ok_response.json().get("status"), "ok")
        mock_post.assert_called_once()

        rate_limited = client.post(reverse("consultation"), data=payload)
        self.assertEqual(rate_limited.status_code, 429)
        self.assertIn("надто часто", rate_limited.json().get("message", ""))


class PropertyActionsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        self.deal_type = DealType.objects.create(name="Продаж")
        self.property = Property.objects.create(
            title="Тестова квартира",
            address="Київ",
            price=100000,
            area=50,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

    def test_like_toggle_requires_auth_and_toggles(self):
        user = CustomUser.objects.create_user(username="u1", password="pass12345")
        self.client.force_login(user)

        resp_like = self.client.post(reverse("toggle_like", args=[self.property.id]))
        self.assertEqual(resp_like.status_code, 200)
        self.assertEqual(resp_like.json().get("status"), "liked")

        resp_unlike = self.client.post(reverse("toggle_like", args=[self.property.id]))
        self.assertEqual(resp_unlike.status_code, 200)
        self.assertEqual(resp_unlike.json().get("status"), "unliked")

    def test_toggle_featured_requires_staff(self):
        staff = CustomUser.objects.create_user(
            username="staff", password="pass12345", is_staff=True
        )
        self.client.force_login(staff)

        resp = self.client.post(
            reverse("toggle_featured_homepage", args=[self.property.id]),
            data={"featured": "true"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body.get("status"), "ok")
        self.assertTrue(body.get("featured"))

    def test_toggle_featured_rejects_non_staff(self):
        user = CustomUser.objects.create_user(
            username="u2", password="pass12345", is_staff=False
        )
        self.client.force_login(user)

        resp = self.client.post(
            reverse("toggle_featured_homepage", args=[self.property.id]),
            data={"featured": "true"},
        )
        self.assertEqual(resp.status_code, 403)


class SearchPageSmokeTest(TestCase):
    def setUp(self):
        site = Site.objects.get_current()
        SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-id",
            secret="test-secret",
        ).sites.add(site)

    def test_search_page_renders(self):
        client = Client()
        response = client.get(reverse("property_search"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("property-results", content)
        self.assertIn("property-sort-wrapper", content)

    def test_api_filters_featured_true(self):
        pt = PropertyType.objects.create(name="Будинок", slug="house")
        deal = DealType.objects.create(name="Оренда")
        featured_prop = Property.objects.create(
            title="Топовий",
            address="Київ",
            price=50_000,
            area=80,
            rooms=3,
            featured_homepage=True,
            property_type=pt,
            deal_type=deal,
        )
        Property.objects.create(
            title="Звичайний",
            address="Львів",
            price=40_000,
            area=60,
            rooms=2,
            featured_homepage=False,
            property_type=pt,
            deal_type=deal,
        )

        client = Client()
        url = reverse("house_api:property_list")
        response = client.get(url, {"featured": "true"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        ids = [item["id"] for item in data.get("results", [])]
        self.assertIn(featured_prop.id, ids)
        self.assertEqual(len(ids), 1)


class ApiAdminAccessTest(TestCase):
    def setUp(self):
        self.client = Client()
        site = Site.objects.get_current()
        SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-id",
            secret="test-secret",
        ).sites.add(site)

    def test_api_admin_requires_staff(self):
        url = reverse("property_api_admin")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 404)

        staff = CustomUser.objects.create_user(
            username="staff", password="pass12345", is_staff=True
        )
        self.client.force_login(staff)
        resp_staff = self.client.get(url)
        self.assertEqual(resp_staff.status_code, 200)


@override_settings(
    IMPORT_RATE_LIMIT=1,
    IMPORT_RATE_WINDOW=60,
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class ImportRateLimitTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff = CustomUser.objects.create_user(
            username="staff", password="pass12345", is_staff=True
        )
        self.property_type = PropertyType.objects.create(name="Будинок", slug="house")
        self.deal_type = DealType.objects.create(name="Продаж")

    def test_import_endpoint_staff_only_and_rate_limited(self):
        url = reverse("house_api:property_import")
        payload = [
            {
                "title": "Будинок",
                "address": "Київ",
                "price": 100000,
                "area": 120,
                "rooms": 3,
                "property_type_id": self.property_type.id,
                "deal_type_id": self.deal_type.id,
            }
        ]

        # Non-authenticated
        resp = self.client.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(resp.status_code, 403)

        # Staff can import once
        self.client.force_login(self.staff)
        ok_resp = self.client.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(ok_resp.status_code, 201)

        # Repeated call in the same window is throttled
        throttled = self.client.post(
            url, data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(throttled.status_code, 429)
