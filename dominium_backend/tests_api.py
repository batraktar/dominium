import json
import re
from io import BytesIO
from unittest.mock import Mock, patch

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, RequestFactory, TestCase, override_settings
from django.urls import reverse
from PIL import Image

from accounts.models import CustomUser
from house.models import DealType, Property, PropertyImage, PropertyType
from dominium_backend.seo_regions import CITY_LANDING_CONFIG
from dominium_backend.views.common import get_client_ip


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    TELEGRAM_BOT_TOKEN="dummy-token",
    TELEGRAM_CHAT_IDS=[123],
    CONSULTATION_RATE_LIMIT=1,
    CONSULTATION_RATE_WINDOW=60,
)
class ConsultationEndpointTest(TestCase):
    @patch("dominium_backend.views.public.requests.post")
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


class ClientIpResolutionTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(TRUST_X_FORWARDED_FOR=False, TRUSTED_PROXY_IPS=["127.0.0.1"])
    def test_does_not_trust_forwarded_header_by_default(self):
        request = self.factory.get(
            "/",
            REMOTE_ADDR="10.10.10.10",
            HTTP_X_FORWARDED_FOR="203.0.113.10, 127.0.0.1",
        )
        self.assertEqual(get_client_ip(request), "10.10.10.10")

    @override_settings(TRUST_X_FORWARDED_FOR=True, TRUSTED_PROXY_IPS=["127.0.0.1"])
    def test_uses_forwarded_header_only_from_trusted_proxy(self):
        request = self.factory.get(
            "/",
            REMOTE_ADDR="127.0.0.1",
            HTTP_X_FORWARDED_FOR="203.0.113.10, 127.0.0.1",
        )
        self.assertEqual(get_client_ip(request), "203.0.113.10")

    @override_settings(TRUST_X_FORWARDED_FOR=True, TRUSTED_PROXY_IPS=["127.0.0.1"])
    def test_ignores_forwarded_header_from_untrusted_source(self):
        request = self.factory.get(
            "/",
            REMOTE_ADDR="198.51.100.20",
            HTTP_X_FORWARDED_FOR="203.0.113.10",
        )
        self.assertEqual(get_client_ip(request), "198.51.100.20")


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
        self.assertIn("<title>Пошук нерухомості - DOMINIUM</title>", content)
        self.assertIn('id="django-csrf-token"', content)
        self.assertNotIn("property-sort-wrapper", content)
        self.assertTrue('id="root"' in content or "React bundle недоступний" in content)
        self.assertIn("index, follow", response.headers.get("X-Robots-Tag", ""))
        self.assertIn('"@type":"WebSite"', content)
        self.assertIn('"SearchAction"', content)
        self.assertIn('"CollectionPage"', content)

    @override_settings(SEO_CANONICAL_HOST="example.com", SEO_CANONICAL_SCHEME="https")
    def test_search_canonical_uses_configured_host(self):
        response = self.client.get(reverse("property_search"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn('rel="canonical" href="https://example.com/search/"', content)

    def test_search_tracking_params_are_removed_from_canonical_and_noindex(self):
        response = self.client.get(
            reverse("property_search"),
            {"utm_source": "google", "gclid": "click-id", "fbclid": "fb-id"},
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn('rel="canonical" href="http://testserver/search/"', content)
        self.assertNotIn("utm_source=google", content)
        self.assertNotIn("gclid=click-id", content)
        self.assertNotIn("fbclid=fb-id", content)
        self.assertIn(
            'name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"',
            content,
        )
        self.assertIn("index, follow", response.headers.get("X-Robots-Tag", ""))

    def test_search_canonical_keeps_real_filters_and_drops_tracking_params(self):
        response = self.client.get(
            reverse("property_search"),
            {
                "q": "Львів",
                "utm_campaign": "winter",
                "msclkid": "ms-click-id",
            },
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("?q=%D0%9B%D1%8C%D0%B2%D1%96%D0%B2", content)
        self.assertNotIn("utm_campaign=winter", content)
        self.assertNotIn("msclkid=ms-click-id", content)
        self.assertIn("noindex, follow", response.headers.get("X-Robots-Tag", ""))

    @override_settings(SEO_CANONICAL_HOST="example.com", SEO_CANONICAL_SCHEME="https")
    def test_robots_txt_uses_configured_host(self):
        response = self.client.get(reverse("robots_txt"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("https://example.com/sitemap.xml", content)
        self.assertIn("https://example.com/sitemap-images.xml", content)

    def test_interactive_map_test_page_renders(self):
        property_type = PropertyType.objects.create(name="Квартира", slug="map-flat")
        deal_type = DealType.objects.create(name="Продаж")
        Property.objects.create(
            title="Тестовий обʼєкт на карті",
            address="Ужгород, центр",
            latitude=48.6208,
            longitude=22.2879,
            price=92000,
            area=47,
            rooms=1,
            property_type=property_type,
            deal_type=deal_type,
        )

        response = self.client.get(reverse("interactive_map_test"))
        self.assertEqual(response.status_code, 200)

        content = response.content.decode("utf-8")
        self.assertIn(
            "<title>Інтерактивна карта обʼєктів (тест) - DOMINIUM</title>", content
        )
        self.assertIn('content="noindex, nofollow"', content)
        self.assertTrue('id="root"' in content or "React bundle недоступний" in content)
        self.assertIn("noindex, nofollow", response.headers.get("X-Robots-Tag", ""))

    @override_settings(SEO_CANONICAL_HOST="example.com", SEO_CANONICAL_SCHEME="https")
    def test_home_canonical_uses_configured_host_and_strips_tracking_query(self):
        response = self.client.get(
            reverse("start_page"),
            {"utm_source": "newsletter", "gclid": "abc"},
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn('rel="canonical" href="https://example.com/"', content)
        self.assertNotIn("utm_source=newsletter", content)
        self.assertNotIn("gclid=abc", content)
        self.assertIn("index, follow", response.headers.get("X-Robots-Tag", ""))

    def test_interactive_map_test_data_endpoint_returns_points(self):
        property_type = PropertyType.objects.create(
            name="Квартира", slug="map-flat-data"
        )
        deal_type = DealType.objects.create(name="Продаж")
        Property.objects.create(
            title="Тестовий json-point",
            address="Хуст, центр",
            latitude=48.1734,
            longitude=23.2991,
            price=78000,
            area=44,
            rooms=1,
            property_type=property_type,
            deal_type=deal_type,
        )

        response = self.client.get(reverse("interactive_map_test_data"))
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertGreaterEqual(payload.get("count", 0), 1)
        self.assertTrue(payload.get("results"))
        self.assertIn("lat", payload["results"][0])
        self.assertIn("lon", payload["results"][0])

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

    def test_search_pagination_route_returns_spa_shell(self):
        property_type = PropertyType.objects.create(name="Тест", slug="test-type")
        deal_type = DealType.objects.create(name="Продаж")
        for idx in range(12):
            Property.objects.create(
                title=f"Тестовий об'єкт {idx}",
                address=f"Київ, вулиця {idx}",
                price=100000 + idx,
                area=50,
                rooms=2,
                property_type=property_type,
                deal_type=deal_type,
            )

        response_page1 = self.client.get(reverse("property_search"), {"per_page": 9})
        self.assertEqual(response_page1.status_code, 200)
        content_page1 = response_page1.content.decode("utf-8")
        self.assertIn("<title>Пошук нерухомості - DOMINIUM</title>", content_page1)
        self.assertTrue(
            'id="root"' in content_page1 or "React bundle недоступний" in content_page1
        )
        self.assertNotIn("property-sort-wrapper", content_page1)
        self.assertIn(
            'name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"',
            content_page1,
        )

        response_page2 = self.client.get(
            reverse("property_search"),
            {"per_page": 9, "page": 2},
        )
        self.assertEqual(response_page2.status_code, 200)
        content_page2 = response_page2.content.decode("utf-8")
        self.assertIn("<title>Пошук нерухомості - DOMINIUM</title>", content_page2)
        self.assertTrue(
            'id="root"' in content_page2 or "React bundle недоступний" in content_page2
        )
        self.assertIn('name="robots" content="noindex, follow"', content_page2)

    def test_api_query_matches_address_not_only_title(self):
        property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        deal_type = DealType.objects.create(name="Продаж")
        address_match = Property.objects.create(
            title="Стильне житло",
            address="Львів, центр",
            price=120000,
            area=64,
            rooms=2,
            property_type=property_type,
            deal_type=deal_type,
        )
        Property.objects.create(
            title="Інший обʼєкт",
            address="Ужгород",
            price=110000,
            area=58,
            rooms=2,
            property_type=property_type,
            deal_type=deal_type,
        )

        response = self.client.get(
            reverse("house_api:property_list"),
            {"q": "Львів"},
        )
        self.assertEqual(response.status_code, 200)
        result_ids = [item["id"] for item in response.json()["results"]]
        self.assertIn(address_match.id, result_ids)

    def test_api_sort_param_controls_ordering(self):
        property_type = PropertyType.objects.create(name="Будинок", slug="house")
        deal_type = DealType.objects.create(name="Оренда")
        cheap = Property.objects.create(
            title="Дешевший",
            address="Львів",
            price=90000,
            area=80,
            rooms=3,
            property_type=property_type,
            deal_type=deal_type,
        )
        expensive = Property.objects.create(
            title="Дорожчий",
            address="Львів",
            price=190000,
            area=95,
            rooms=4,
            property_type=property_type,
            deal_type=deal_type,
        )

        asc_response = self.client.get(
            reverse("house_api:property_list"),
            {"sort": "price_asc"},
        )
        self.assertEqual(asc_response.status_code, 200)
        asc_ids = [item["id"] for item in asc_response.json()["results"]]
        self.assertLess(asc_ids.index(cheap.id), asc_ids.index(expensive.id))

        desc_response = self.client.get(
            reverse("house_api:property_list"),
            {"sort": "price_desc"},
        )
        self.assertEqual(desc_response.status_code, 200)
        desc_ids = [item["id"] for item in desc_response.json()["results"]]
        self.assertLess(desc_ids.index(expensive.id), desc_ids.index(cheap.id))

    def test_api_ignores_legacy_rooms_when_rooms_range_is_present(self):
        property_type = PropertyType.objects.create(name="Таунхаус", slug="townhouse")
        deal_type = DealType.objects.create(name="Продаж")
        suitable = Property.objects.create(
            title="Трикімнатний",
            address="Київ",
            price=150000,
            area=90,
            rooms=3,
            property_type=property_type,
            deal_type=deal_type,
        )
        one_room = Property.objects.create(
            title="Однокімнатний",
            address="Київ",
            price=80000,
            area=42,
            rooms=1,
            property_type=property_type,
            deal_type=deal_type,
        )

        response = self.client.get(
            reverse("house_api:property_list"),
            {"rooms_min": 2, "rooms": "1"},
        )
        self.assertEqual(response.status_code, 200)
        result_ids = [item["id"] for item in response.json()["results"]]
        self.assertIn(suitable.id, result_ids)
        self.assertNotIn(one_room.id, result_ids)


class SeoPagesTest(TestCase):
    def setUp(self):
        self.client = Client()
        site = Site.objects.get_current()
        SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-id",
            secret="test-secret",
        ).sites.add(site)
        self.property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        self.deal_type = DealType.objects.create(name="Продаж")

        self.lviv_property = Property.objects.create(
            title="Квартира у Львові",
            address="Львів, Франківський район",
            price=120000,
            area=61,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )
        self.zakarpattia_property = Property.objects.create(
            title="Будинок в Ужгороді",
            address="Ужгород, Закарпатська область",
            price=175000,
            area=140,
            rooms=4,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )
        self.chernivtsi_property = Property.objects.create(
            title="Апартаменти в Чернівцях",
            address="Чернівці, Чернівецька область",
            price=98000,
            area=49,
            rooms=1,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )
        self.ternopil_property = Property.objects.create(
            title="Квартира у Тернополі",
            address="Тернопіль, Тернопільська область",
            price=86000,
            area=52,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )
        self.kyiv_property = Property.objects.create(
            title="Пентхаус у Києві",
            address="Київ, Печерський район",
            price=350000,
            area=130,
            rooms=3,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

        image_buffer = BytesIO()
        Image.new("RGB", (16, 16), color=(240, 240, 240)).save(
            image_buffer, format="JPEG"
        )
        PropertyImage.objects.create(
            property=self.lviv_property,
            image=ContentFile(image_buffer.getvalue(), name="seo-test.jpg"),
            is_main=True,
        )

    def test_region_landing_lviv_renders_spa_shell_with_seo_meta(self):
        response = self.client.get(
            reverse("region_landing", kwargs={"region_slug": "lviv"})
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn(
            "<title>Нерухомість у Львові та західному кластері — DOMINIUM</title>",
            content,
        )
        self.assertTrue('id="root"' in content or "React bundle недоступний" in content)
        self.assertIn("max-image-preview:large", content)
        self.assertIn('"CollectionPage"', content)
        self.assertIn("index, follow", response.headers.get("X-Robots-Tag", ""))

    def test_region_landing_contains_og_meta(self):
        response = self.client.get(
            reverse("region_landing", kwargs={"region_slug": "lviv"})
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn(
            '<meta property="og:title" content="Нерухомість у Львові та західному кластері — DOMINIUM"',
            content,
        )
        self.assertIn('<meta property="og:image" content="', content)
        self.assertIn('<link rel="canonical" href="', content)

    def test_region_landing_canonical_excludes_pagination_and_sort_params(self):
        response = self.client.get(
            reverse("region_landing", kwargs={"region_slug": "lviv"}),
            {
                "q": "Львів",
                "page": 2,
                "sort": "price_desc",
                "currency": "EUR",
                "per_page": 24,
            },
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("?q=%D0%9B%D1%8C%D0%B2%D1%96%D0%B2", content)
        self.assertNotIn("sort=price_desc", content)
        self.assertNotIn("page=2", content)
        self.assertNotIn("currency=EUR", content)
        self.assertNotIn("per_page=24", content)
        self.assertIn("noindex, follow", response.headers.get("X-Robots-Tag", ""))

    def test_region_scope_api_filters_cluster_keywords(self):
        response = self.client.get(
            reverse("house_api:property_list"),
            {"region_slug": "zakarpattia", "page_size": 20},
        )
        self.assertEqual(response.status_code, 200)
        result_ids = {item["id"] for item in response.json().get("results", [])}
        self.assertIn(self.lviv_property.id, result_ids)
        self.assertIn(self.zakarpattia_property.id, result_ids)
        self.assertIn(self.chernivtsi_property.id, result_ids)
        self.assertIn(self.ternopil_property.id, result_ids)
        self.assertIn(self.kyiv_property.id, result_ids)

    def test_requested_region_urls_render(self):
        for slug in [
            "lviv",
            "zakarpattia",
            "ivano-frankivsk",
            "chernivtsi",
            "ternopil",
            "kyiv",
        ]:
            response = self.client.get(
                reverse("region_landing", kwargs={"region_slug": slug})
            )
            self.assertEqual(response.status_code, 200, msg=f"region {slug}")
            content = response.content.decode("utf-8")
            self.assertTrue(
                'id="root"' in content or "React bundle недоступний" in content
            )

    def test_requested_city_urls_render(self):
        city_slugs = {
            city_cfg["city"]: slug
            for slug, city_cfg in CITY_LANDING_CONFIG.items()
            if city_cfg["city"] in {"Львів", "Ужгород", "Чернівці", "Тернопіль", "Київ"}
        }
        self.assertEqual(len(city_slugs), 5)

        for city, slug in city_slugs.items():
            response = self.client.get(
                reverse("city_landing", kwargs={"city_slug": slug})
            )
            self.assertEqual(response.status_code, 200, msg=f"city {city}")
            content = response.content.decode("utf-8")
            self.assertTrue(
                'id="root"' in content or "React bundle недоступний" in content
            )

    def test_unknown_region_slug_returns_404(self):
        response = self.client.get(
            reverse("region_landing", kwargs={"region_slug": "unknown-region"})
        )
        self.assertEqual(response.status_code, 404)

    def test_unknown_city_slug_returns_404(self):
        response = self.client.get(
            reverse("city_landing", kwargs={"city_slug": "unknown-city"})
        )
        self.assertEqual(response.status_code, 404)

    def test_city_scope_api_filters_cluster_keywords(self):
        city_slugs = {
            city_cfg["city"]: slug
            for slug, city_cfg in CITY_LANDING_CONFIG.items()
            if city_cfg["city"] in {"Львів", "Ужгород"}
        }
        lviv_slug = city_slugs["Львів"]

        response = self.client.get(
            reverse("house_api:property_list"),
            {"city_slug": lviv_slug, "page_size": 20},
        )
        self.assertEqual(response.status_code, 200)
        result_ids = {item["id"] for item in response.json().get("results", [])}
        self.assertIn(self.lviv_property.id, result_ids)
        self.assertIn(self.zakarpattia_property.id, result_ids)

    def test_filtered_search_is_noindex(self):
        response = self.client.get(reverse("property_search"), {"q": "Львів"})
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn('name="robots" content="noindex, follow"', content)
        self.assertIn("noindex, follow", response.headers.get("X-Robots-Tag", ""))

    def test_image_sitemap_contains_image_entries(self):
        response = self.client.get(reverse("sitemap_images"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("<image:image>", content)
        self.assertIn(self.lviv_property.title, content)

    def test_xml_sitemap_contains_city_urls(self):
        response = self.client.get(reverse("sitemap"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("/search/city/", content)


class PropertyXssSecurityTest(TestCase):
    def setUp(self):
        self.client = Client()
        site = Site.objects.get_current()
        SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-id",
            secret="test-secret",
        ).sites.add(site)

        self.staff = CustomUser.objects.create_user(
            username="security_staff",
            password="pass12345",
            is_staff=True,
        )
        self.property_type = PropertyType.objects.create(
            name="Пентхаус", slug="penthouse"
        )
        self.deal_type = DealType.objects.create(name="Продаж")

    def test_api_sanitizes_malicious_description_on_save(self):
        self.client.force_login(self.staff)
        payload = {
            "title": "Security Listing",
            "address": "Київ, Центр",
            "price": 250000,
            "area": 120,
            "rooms": 3,
            "description": (
                "<script>alert('XSS')</script>"
                "<p>Опис <b>жирний</b> <i>курсив</i></p>"
                "<img src=x onerror=alert('boom')>"
            ),
            "property_type_id": self.property_type.id,
            "deal_type_id": self.deal_type.id,
        }

        response = self.client.post(
            reverse("house_api:property_list"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        created_id = response.json().get("id")
        self.assertIsNotNone(created_id)

        property_obj = Property.objects.get(id=created_id)
        normalized = property_obj.description.lower()
        self.assertNotIn("<script", normalized)
        self.assertNotIn("alert('xss')", normalized)
        self.assertNotIn("onerror", normalized)
        self.assertIn("<b>жирний</b>", property_obj.description)
        self.assertIn("<i>курсив</i>", property_obj.description)

    def test_property_detail_does_not_execute_script_and_has_csp_header(self):
        property_obj = Property.objects.create(
            title="Unsafe Legacy Description",
            address="Київ, Поділ",
            price=180000,
            area=90,
            rooms=2,
            latitude=50.4501,
            longitude=30.5234,
            description="<script>alert('XSS')</script><p>Safe <b>HTML</b></p>",
            property_type=self.property_type,
            deal_type=self.deal_type,
        )
        image_buffer = BytesIO()
        Image.new("RGB", (12, 12), color=(200, 200, 200)).save(
            image_buffer, format="JPEG"
        )
        PropertyImage.objects.create(
            property=property_obj,
            image=ContentFile(image_buffer.getvalue(), name="detail-seo.jpg"),
            is_main=True,
        )

        response = self.client.get(reverse("property_detail", args=[property_obj.slug]))
        self.assertEqual(response.status_code, 200)

        content = response.content.decode("utf-8")
        self.assertNotIn("<script>alert('XSS')</script>", content)
        self.assertNotIn("alert('XSS')", content)
        self.assertTrue('id="root"' in content or "React bundle недоступний" in content)
        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("index, follow", response.headers.get("X-Robots-Tag", ""))
        self.assertIn('"@type":"RealEstateListing"', content)
        self.assertIn('<meta property="article:published_time"', content)
        self.assertIn("property_images/", content)

    def test_property_detail_shell_escapes_script_breakout_sequences(self):
        property_obj = Property.objects.create(
            title="Bad </script><script>alert('XSS')</script> title",
            address="Київ",
            price=190000,
            area=88,
            rooms=2,
            description="<p>Safe content</p>",
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

        response = self.client.get(reverse("property_detail", args=[property_obj.slug]))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")

        self.assertNotIn("</script><script>alert('XSS')</script>", content)
        self.assertIn("&lt;/script&gt;", content)

    @override_settings(SEO_CANONICAL_HOST="example.com", SEO_CANONICAL_SCHEME="https")
    def test_property_detail_canonical_uses_configured_host(self):
        property_obj = Property.objects.create(
            title="Canonical Host Test",
            address="Київ",
            price=150000,
            area=70,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

        response = self.client.get(reverse("property_detail", args=[property_obj.slug]))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("https://example.com/property/", content)
        self.assertIn(
            '<meta property="og:url" content="https://example.com/property/', content
        )


class PropertyApiAuthorizationTest(TestCase):
    def setUp(self):
        self.client = Client()
        property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        deal_type = DealType.objects.create(name="Продаж")
        self.property = Property.objects.create(
            title="Перевірка доступу",
            address="Київ",
            price=123000,
            area=77,
            rooms=3,
            property_type=property_type,
            deal_type=deal_type,
        )

    def test_public_user_can_read_but_cannot_delete(self):
        detail_url = reverse("house_api:property_detail", args=[self.property.id])

        read_response = self.client.get(detail_url)
        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(read_response.json().get("id"), self.property.id)

        delete_response = self.client.delete(detail_url)
        self.assertIn(delete_response.status_code, (401, 403))
        self.assertTrue(Property.objects.filter(id=self.property.id).exists())


@override_settings(
    LOGIN_RATE_LIMIT=2,
    LOGIN_RATE_WINDOW=60,
)
class LoginRateLimitTest(TestCase):
    def setUp(self):
        self.client = Client()
        cache.clear()
        self.user = CustomUser.objects.create_user(
            username="login-rate-user",
            email="login-rate@example.com",
            password="Pass12345!",
            is_active=True,
        )

    def _post_login(self, password: str):
        return self.client.post(
            reverse("login"),
            data={
                "email": self.user.email,
                "password": password,
                "next": "/",
            },
            HTTP_ACCEPT="application/json",
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

    def test_login_is_rate_limited_after_repeated_failures(self):
        first = self._post_login("wrong-password")
        self.assertEqual(first.status_code, 400)

        second = self._post_login("wrong-password")
        self.assertEqual(second.status_code, 400)

        third = self._post_login("wrong-password")
        self.assertEqual(third.status_code, 429)
        payload = third.json()
        self.assertEqual(payload.get("code"), "rate_limited")
        self.assertIn("Забагато спроб", payload.get("message", ""))

    def test_successful_login_resets_rate_limit_bucket(self):
        failed = self._post_login("wrong-password")
        self.assertEqual(failed.status_code, 400)

        success = self._post_login("Pass12345!")
        self.assertEqual(success.status_code, 200)
        self.assertEqual(success.json().get("status"), "ok")

        failed_after_success = self._post_login("wrong-password")
        self.assertEqual(failed_after_success.status_code, 400)


@override_settings(
    ADMIN_IMAGE_MAX_BYTES=16,
    ADMIN_IMAGE_UPLOAD_MAX_FILES=2,
)
class AdminImageUploadSecurityTest(TestCase):
    def setUp(self):
        self.staff_client = Client()
        self.staff = CustomUser.objects.create_user(
            username="image_staff",
            password="pass12345",
            is_staff=True,
        )
        self.staff_client.force_login(self.staff)

        property_type = PropertyType.objects.create(name="Фото test", slug="photo-test")
        deal_type = DealType.objects.create(name="Продаж")
        self.property = Property.objects.create(
            title="Upload test property",
            address="Львів",
            price=100000,
            area=55,
            rooms=2,
            property_type=property_type,
            deal_type=deal_type,
        )
        self.images_url = reverse("house_api:property_images", args=[self.property.id])

    def test_rejects_svg_upload(self):
        upload = SimpleUploadedFile(
            "unsafe.svg",
            b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
            content_type="image/svg+xml",
        )

        response = self.staff_client.post(self.images_url, data={"images": upload})
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertFalse(payload.get("created"))
        self.assertTrue(payload.get("errors"))
        self.assertIn("SVG", payload["errors"][0].get("error", ""))

    def test_rejects_oversized_upload(self):
        upload = SimpleUploadedFile(
            "too-big.jpg",
            b"x" * 32,
            content_type="image/jpeg",
        )

        response = self.staff_client.post(self.images_url, data={"images": upload})
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertFalse(payload.get("created"))
        self.assertTrue(payload.get("errors"))
        self.assertIn("ліміт", payload["errors"][0].get("error", ""))

    def test_rejects_fake_image_payload(self):
        upload = SimpleUploadedFile(
            "fake.jpg",
            b"not-an-image",
            content_type="image/jpeg",
        )

        response = self.staff_client.post(self.images_url, data={"images": upload})
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertFalse(payload.get("created"))
        self.assertTrue(payload.get("errors"))
        self.assertIn("не є валідним", payload["errors"][0].get("error", ""))

    def test_rejects_more_files_than_limit(self):
        files = [
            SimpleUploadedFile("a.jpg", b"x", content_type="image/jpeg"),
            SimpleUploadedFile("b.jpg", b"x", content_type="image/jpeg"),
            SimpleUploadedFile("c.jpg", b"x", content_type="image/jpeg"),
        ]
        response = self.staff_client.post(self.images_url, data={"images": files})
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("не більше", payload.get("error", ""))

    def test_non_staff_gets_forbidden_json_on_bulk_action(self):
        response = self.client.post(
            reverse("house_api:property_bulk_action"),
            data=json.dumps({"ids": [self.property.id], "action": "archive"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json().get("error"), "forbidden")


class HighlightSettingsAuthorizationTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse("house_api:highlight_settings")

    def test_public_can_read_but_cannot_modify(self):
        read_response = self.client.get(self.url)
        self.assertEqual(read_response.status_code, 200)
        self.assertIn("result", read_response.json())

        patch_response = self.client.patch(
            self.url,
            data=json.dumps({"limit": 5}),
            content_type="application/json",
        )
        self.assertIn(patch_response.status_code, (401, 403))


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


class SpaRuntimeSwitchAuditTest(TestCase):
    def setUp(self):
        self.client = Client()
        site = Site.objects.get_current()
        SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-id",
            secret="test-secret",
        ).sites.add(site)

        self.staff = CustomUser.objects.create_user(
            username="runtime_staff",
            password="pass12345",
            is_staff=True,
        )
        property_type = PropertyType.objects.create(
            name="Квартира", slug="runtime-flat"
        )
        deal_type = DealType.objects.create(name="Продаж")
        self.property = Property.objects.create(
            title="Runtime shell object",
            address="Львів, центр",
            price=125000,
            area=64,
            rooms=2,
            property_type=property_type,
            deal_type=deal_type,
        )
        lviv_city_slug = next(
            (
                slug
                for slug, city_cfg in CITY_LANDING_CONFIG.items()
                if city_cfg.get("city") == "Львів"
            ),
            "",
        )
        self.city_slug = lviv_city_slug or next(iter(CITY_LANDING_CONFIG.keys()))

    def _assert_react_spa_shell(self, response):
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn('name="dominium-runtime-shell" content="react-spa"', content)
        self.assertTrue('id="root"' in content or "React bundle недоступний" in content)
        return content

    def _assert_absent_legacy_assets(self, content, asset_markers):
        for marker in asset_markers:
            self.assertNotIn(marker, content)

    def test_migrated_routes_render_spa_shell_without_legacy_assets(self):
        checks = [
            (
                reverse("property_search"),
                (
                    "base/assets/js/search/api.js",
                    "base/assets/js/search/ui.js",
                    "base/assets/js/search/index.js",
                ),
            ),
            (
                reverse("liked_properties"),
                (
                    "base/assets/js/likes/index.js",
                    "base/assets/js/share.js",
                ),
            ),
            (
                reverse("property_detail", args=[self.property.slug]),
                (
                    "base/assets/js/property_map.js",
                    "base/assets/js/property_detail_admin.js",
                ),
            ),
            (
                reverse("property_api_demo"),
                ("base/assets/js/property_api_demo.js",),
            ),
            (
                reverse("interactive_map_test"),
                (
                    "base/assets/js/map_config.js",
                    "base/assets/js/interactive_map_test.js",
                ),
            ),
            (
                f"{reverse('landing')}?method=email",
                ("base/assets/js/social_signup_bridge.js",),
            ),
            (
                reverse("region_landing", kwargs={"region_slug": "lviv"}),
                ("base/assets/js/search/index.js",),
            ),
            (
                reverse("city_landing", kwargs={"city_slug": self.city_slug}),
                ("base/assets/js/search/index.js",),
            ),
        ]

        for path, legacy_assets in checks:
            response = self.client.get(path)
            content = self._assert_react_spa_shell(response)
            self._assert_absent_legacy_assets(content, legacy_assets)

    def test_api_admin_staff_route_uses_spa_shell_without_legacy_script(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("property_api_admin"))
        content = self._assert_react_spa_shell(response)
        self.assertNotIn("base/assets/js/property_api_admin.js", content)

    def test_home_route_remains_legacy_runtime(self):
        response = self.client.get(reverse("start_page"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertNotIn('name="dominium-runtime-shell" content="react-spa"', content)
        self.assertIn('id="csrf-token"', content)

    def test_unknown_route_uses_backend_404_template(self):
        response = self.client.get("/runtime-audit-missing-route/")
        self.assertEqual(response.status_code, 404)
        content = response.content.decode("utf-8")
        self.assertNotIn('name="dominium-runtime-shell" content="react-spa"', content)
        self.assertIn("noindex, nofollow", response.headers.get("X-Robots-Tag", ""))


class SpaSeoHeadersTest(TestCase):
    def setUp(self):
        self.client = Client()
        site = Site.objects.get_current()
        SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-id",
            secret="test-secret",
        ).sites.add(site)

    def test_likes_route_sets_noindex_header(self):
        response = self.client.get(reverse("liked_properties"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("noindex, nofollow", response.headers.get("X-Robots-Tag", ""))

    def test_api_demo_route_sets_noindex_header(self):
        response = self.client.get(reverse("property_api_demo"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("noindex, nofollow", response.headers.get("X-Robots-Tag", ""))

    def test_signup_route_sets_noindex_and_method_canonical(self):
        response = self.client.get(reverse("landing"), {"method": "google"})
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("noindex, nofollow", response.headers.get("X-Robots-Tag", ""))
        self.assertIn("/signup/?method=google", content)

    def test_404_route_sets_noindex_header(self):
        response = self.client.get("/totally-missing-page/")
        self.assertEqual(response.status_code, 404)
        content = response.content.decode("utf-8")
        self.assertIn('name="robots" content="noindex, nofollow"', content)
        self.assertIn("noindex, nofollow", response.headers.get("X-Robots-Tag", ""))

    def test_search_route_csp_header_contains_runtime_nonce(self):
        response = self.client.get(reverse("property_search"))
        self.assertEqual(response.status_code, 200)
        csp_header = response.headers.get("Content-Security-Policy", "")
        self.assertIn("nonce-", csp_header)
        self.assertNotIn("{nonce}", csp_header)

        content = response.content.decode("utf-8")
        self.assertIn('nonce="', content)
        self.assertIn("window.tailwind = window.tailwind || {};", content)

    def test_home_route_jsonld_scripts_include_nonce(self):
        response = self.client.get(reverse("start_page"))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn('type="application/ld+json"', content)
        self.assertIn('nonce="', content)

    def test_search_route_sets_strict_csp_report_only_header(self):
        response = self.client.get(reverse("property_search"))
        self.assertEqual(response.status_code, 200)
        report_only_header = response.headers.get(
            "Content-Security-Policy-Report-Only", ""
        )
        self.assertIn("script-src", report_only_header)
        self.assertIn("nonce-", report_only_header)
        self.assertNotIn("script-src 'self' 'unsafe-inline'", report_only_header)
        self.assertIn("report-uri /_csp/report/", report_only_header)

    def test_search_route_sets_additional_security_headers(self):
        response = self.client.get(reverse("property_search"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("Cross-Origin-Resource-Policy", ""), "same-site"
        )
        self.assertEqual(
            response.headers.get("X-Permitted-Cross-Domain-Policies", ""), "none"
        )
        self.assertEqual(response.headers.get("Origin-Agent-Cluster", ""), "?1")
        permissions_policy = response.headers.get("Permissions-Policy", "")
        self.assertIn("camera=()", permissions_policy)
        self.assertIn("microphone=()", permissions_policy)
        self.assertIn("geolocation=()", permissions_policy)
        self.assertIn("fullscreen=()", permissions_policy)
        self.assertIn("clipboard-write=(self)", permissions_policy)
        self.assertIn("web-share=(self)", permissions_policy)

    def test_csp_report_endpoint_accepts_standard_report_payload(self):
        payload = {
            "csp-report": {
                "document-uri": "http://testserver/search/",
                "violated-directive": "script-src-elem",
                "effective-directive": "script-src-elem",
                "blocked-uri": "inline",
            }
        }
        response = self.client.post(
            reverse("csp_report"),
            data=json.dumps(payload),
            content_type="application/csp-report",
        )
        self.assertEqual(response.status_code, 204)

    @override_settings(
        CACHES={
            "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
        },
        CSP_REPORT_RATE_LIMIT=1,
        CSP_REPORT_RATE_WINDOW=60,
    )
    def test_csp_report_endpoint_rate_limits_repeated_posts(self):
        payload = {
            "csp-report": {
                "document-uri": "http://testserver/search/",
                "violated-directive": "script-src-elem",
                "effective-directive": "script-src-elem",
                "blocked-uri": "inline",
            }
        }
        with patch("dominium_backend.views.security.logger.warning") as warning_mock:
            first = self.client.post(
                reverse("csp_report"),
                data=json.dumps(payload),
                content_type="application/csp-report",
                REMOTE_ADDR="198.51.100.40",
            )
            second = self.client.post(
                reverse("csp_report"),
                data=json.dumps(payload),
                content_type="application/csp-report",
                REMOTE_ADDR="198.51.100.40",
            )

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)
        self.assertEqual(warning_mock.call_count, 1)


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


class ImportLinkSecurityTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff = CustomUser.objects.create_user(
            username="import_staff",
            password="pass12345",
            is_staff=True,
        )

    @patch("house.api.views.import_property_from_url")
    def test_import_link_parses_false_geocode_flag(self, mock_import):
        self.client.force_login(self.staff)
        mock_property = Mock()
        mock_property.id = 777
        mock_property.title = "Imported"
        mock_import.return_value = (mock_property, [])

        response = self.client.post(
            reverse("house_api:property_import_link"),
            data=json.dumps({"url": "https://example.com/listing", "geocode": "false"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(mock_import.call_args.kwargs["geocode_missing"])

    def test_import_link_rejects_invalid_geocode_flag(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("house_api:property_import_link"),
            data=json.dumps(
                {"url": "https://example.com/listing", "geocode": "invalid"}
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("geocode", response.json().get("error", "").lower())


class ImportCsrfProtectionTest(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.staff = CustomUser.objects.create_user(
            username="csrf_staff",
            password="pass12345",
            is_staff=True,
        )
        self.client.force_login(self.staff)

    @patch("house.api.views.import_property_from_url")
    def test_import_link_requires_csrf_for_session_requests(self, mock_import):
        mock_property = Mock()
        mock_property.id = 778
        mock_property.title = "Imported"
        mock_import.return_value = (mock_property, [])

        response = self.client.post(
            reverse("house_api:property_import_link"),
            data=json.dumps({"url": "https://example.com/listing"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)


class PropertyCoordinateValidationTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff = CustomUser.objects.create_user(
            username="coord_staff",
            password="pass12345",
            is_staff=True,
        )
        self.property_type = PropertyType.objects.create(
            name="Таунхаус", slug="townhouse"
        )
        self.deal_type = DealType.objects.create(name="Продаж")

    def test_rejects_invalid_latitude_longitude_ranges(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("house_api:property_list"),
            data=json.dumps(
                {
                    "title": "Координатний тест",
                    "address": "Київ",
                    "price": 100000,
                    "area": 80,
                    "rooms": 3,
                    "latitude": 200,
                    "longitude": 400,
                    "property_type_id": self.property_type.id,
                    "deal_type_id": self.deal_type.id,
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        errors = response.json().get("errors", {})
        self.assertIn("latitude", errors)
        self.assertIn("longitude", errors)
