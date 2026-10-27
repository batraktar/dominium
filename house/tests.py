import json
from io import BytesIO, StringIO
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from PIL import Image, ImageDraw

from accounts.models import CustomUser
from house.management.commands.sync_crm_properties import (
    Command as RealtsoftSyncCommand,
    _build_address_parts,
    _prepare_images,
    _resolve_crm_manager,
    _should_import,
)
from house.models import (
    AppSettings,
    DealType,
    ExternalProperty,
    Property,
    PropertyImage,
    PropertyType,
)
from house.services.importer import import_property_from_url
from house.services.search import apply_currency_display
from house.utils.html_parser import parse_property_html
from house.utils.image_selection import image_url_identity_key
from house.utils.network_security import UnsafeImportURLError, ensure_safe_import_url


class PropertyApiSmokeTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff = CustomUser.objects.create_user(
            username="api_staff",
            password="pass12345",
            is_staff=True,
        )
        self.property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        self.deal_type = DealType.objects.create(name="Продаж")

    def test_list_properties_returns_created_object(self):
        Property.objects.create(
            title="Тестова квартира",
            address="Київ, вул. Тестова",
            price=120000,
            area=54,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

        url = reverse("house_api:property_list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["title"], "Тестова квартира")
        self.assertEqual(payload["results"][0]["property_type"]["name"], "Квартира")

    def test_crm_manager_name_is_visible_only_to_staff(self):
        property_obj = Property.objects.create(
            title="Об'єкт менеджера",
            address="Ужгород",
            price=120000,
            area=54,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )
        ExternalProperty.objects.create(
            crm_property_id=1546,
            property=property_obj,
            source="realtsoft",
            crm_manager_user_id=49,
            crm_manager_name="Пульч Ярослава",
            is_import_eligible=True,
        )
        url = reverse("house_api:property_list")

        public_response = self.client.get(url)
        self.assertEqual(public_response.status_code, 200)
        self.assertIsNone(public_response.json()["results"][0]["crm_manager_name"])

        self.client.force_login(self.staff)
        staff_response = self.client.get(url)
        self.assertEqual(staff_response.status_code, 200)
        self.assertEqual(
            staff_response.json()["results"][0]["crm_manager_name"],
            "Пульч Ярослава",
        )

    def test_public_api_hides_realtsoft_property_without_import_tag(self):
        property_obj = Property.objects.create(
            title="Не для реклами",
            address="Ужгород",
            price=90000,
            area=40,
            rooms=1,
            property_type=self.property_type,
            deal_type=self.deal_type,
            external_source="realtsoft",
            external_id="1777",
        )
        ExternalProperty.objects.create(
            crm_property_id=1777,
            property=property_obj,
            source="realtsoft",
            raw_data={"tags_cache": "внутрішній"},
            is_import_eligible=False,
        )
        url = reverse("house_api:property_list")

        self.assertEqual(self.client.get(url).json()["count"], 0)
        self.client.force_login(self.staff)
        self.assertEqual(self.client.get(url).json()["count"], 1)

    def test_resolve_crm_manager_uses_cache(self):
        crm_client = Mock()
        crm_client.get_user.return_value = {"id": 49, "name": "Пульч Ярослава"}
        cache = {}
        item = {"responsible_user_id": 49}

        self.assertEqual(
            _resolve_crm_manager(item, crm_client, cache),
            (49, "Пульч Ярослава"),
        )
        self.assertEqual(
            _resolve_crm_manager(item, crm_client, cache),
            (49, "Пульч Ярослава"),
        )
        crm_client.get_user.assert_called_once_with(49)

    @patch(
        "house.api.views.get_exchange_rates",
        return_value={"USD": 40, "EUR": 50, "UAH": 1},
    )
    def test_list_properties_converts_selected_currency_and_returns_alternatives(
        self, _mock_rates
    ):
        Property.objects.create(
            title="Валютний тест",
            address="Ужгород",
            price=100000,
            area=54,
            rooms=2,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

        response = self.client.get(
            reverse("house_api:property_list"), {"currency": "UAH"}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        result = payload["results"][0]
        self.assertEqual(result["display_price"], 4000000)
        self.assertEqual(result["display_currency_code"], "UAH")
        self.assertEqual(result["display_currency_symbol"], "₴")
        self.assertEqual(
            result["other_currency_values"],
            [
                {"code": "USD", "symbol": "$", "value": 100000},
                {"code": "EUR", "symbol": "€", "value": 80000},
            ],
        )
        self.assertEqual(payload["exchange_rates"], {"USD": 40.0, "EUR": 50.0})

    def test_currency_conversion_respects_source_currency_and_missing_price(self):
        options = {
            "USD": {"symbol": "$"},
            "EUR": {"symbol": "€"},
            "UAH": {"symbol": "₴"},
        }
        eur_property = SimpleNamespace(price=1000, price_currency="EUR")
        uah_property = SimpleNamespace(price=40000, price_currency="UAH")
        missing_price = SimpleNamespace(price=None, price_currency="USD")

        apply_currency_display(
            [eur_property, uah_property, missing_price],
            {"USD": 40, "EUR": 50, "UAH": 1},
            options,
            "USD",
        )

        self.assertEqual(eur_property.display_price, 1250)
        self.assertEqual(uah_property.display_price, 1000)
        self.assertIsNone(missing_price.display_price)
        self.assertEqual(missing_price.other_currency_values, [])

    def test_list_properties_places_locality_before_street_address(self):
        Property.objects.create(
            title="Продається будинок у м. Хуст",
            address="Карпатська, 10",
            price=50000,
            area=90,
            rooms=3,
            property_type=self.property_type,
            deal_type=self.deal_type,
        )

        response = self.client.get(reverse("house_api:property_list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["results"][0]["display_address"],
            "Хуст, Карпатська, 10",
        )

    def test_create_property_via_api(self):
        self.client.force_login(self.staff)
        url = reverse("house_api:property_list")
        payload = {
            "title": "Нове житло",
            "address": "Львів, вул. Прикладна",
            "price": 90000,
            "area": 42,
            "rooms": 1,
            "property_type_id": self.property_type.id,
            "deal_type_id": self.deal_type.id,
        }

        response = self.client.post(
            url, data=json.dumps(payload), content_type="application/json"
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertIn("id", body)
        self.assertEqual(Property.objects.count(), 1)
        created = Property.objects.first()
        self.assertEqual(created.title, "Нове житло")
        self.assertEqual(created.property_type, self.property_type)
        self.assertEqual(created.deal_type, self.deal_type)


class HtmlParserTest(SimpleTestCase):
    def test_parse_minimal_document(self):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="120000" />
          </head>
          <body>
            <h1>Продаж квартири на Печерську</h1>
            <div class="address">Київ, вул. Тестова, 1</div>
            <div class="pdf-area">55 м²</div>
            <div>2 кімнати</div>
            <div class="description">Затишна квартира біля метро.</div>
          </body>
        </html>
        """
        parsed = parse_property_html(html, source="test.html")

        self.assertEqual(parsed.title, "Продаж квартири на Печерську")
        self.assertEqual(parsed.address, "Київ, вул. Тестова, 1")
        self.assertGreater(parsed.price, 0)
        self.assertEqual(parsed.area, 55)
        self.assertGreaterEqual(parsed.rooms, 1)
        self.assertIn("Затишна квартира", parsed.description_html)

    def test_parse_coordinates_from_meta(self):
        html = """
        <html>
          <head>
            <meta property="place:location:latitude" content="50.4501" />
            <meta property="place:location:longitude" content="30.5234" />
            <meta itemprop="price" content="100000" />
          </head>
          <body>
            <h1>Офіс у центрі</h1>
            <div class="address">Київ, Хрещатик</div>
            <div class="pdf-area">80 м²</div>
            <div>3 кімнати</div>
            <p>Офісне приміщення.</p>
          </body>
        </html>
        """
        parsed = parse_property_html(html, source="coords.html", geocode_missing=False)
        self.assertEqual(parsed.latitude, 50.4501)
        self.assertEqual(parsed.longitude, 30.5234)

    def test_parse_coordinates_from_json_ld(self):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="100000" />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Residence",
                "name": "Квартира",
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": 48.6208,
                  "longitude": 22.2879
                }
              }
            </script>
          </head>
          <body>
            <h1>Квартира в Ужгороді</h1>
            <div class="address">Ужгород</div>
          </body>
        </html>
        """
        parsed = parse_property_html(html, source="coords-json-ld.html")
        self.assertEqual(parsed.latitude, 48.6208)
        self.assertEqual(parsed.longitude, 22.2879)

    def test_parse_coordinates_from_map_url(self):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="100000" />
          </head>
          <body>
            <h1>Квартира в Чернівцях</h1>
            <div class="address">Чернівці</div>
            <a href="https://www.google.com/maps?q=48.2915,25.9358">Показати на мапі</a>
          </body>
        </html>
        """
        parsed = parse_property_html(html, source="coords-map-url.html")
        self.assertEqual(parsed.latitude, 48.2915)
        self.assertEqual(parsed.longitude, 25.9358)

    def test_parse_images_prefers_anchor_and_deduplicates_variants(self):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="150000" />
          </head>
          <body>
            <h1>Квартира біля парку</h1>
            <div class="address">Київ, вул. Паркова, 3</div>
            <div class="pdf-area">70 м²</div>
            <div>2 кімнати</div>

            <div class="pdf-img">
              <img src="https://cdn.example.com/images/first.jpg?watermark=1" />
            </div>

            <div id="estate-images">
              <a href="https://cdn.example.com/images/first.jpg">
                <img src="https://cdn.example.com/images/first.jpg?watermark=1" />
              </a>
              <a href="https://cdn.example.com/images/second.jpg">
                <img src="https://cdn.example.com/images/second_thumbnail.jpg" />
              </a>
            </div>
          </body>
        </html>
        """
        parsed = parse_property_html(html, source="gallery.html")

        self.assertEqual(
            parsed.gallery,
            [
                "https://cdn.example.com/images/first.jpg",
                "https://cdn.example.com/images/second.jpg",
            ],
        )
        self.assertEqual(parsed.main_image, "https://cdn.example.com/images/first.jpg")


class ImporterServiceTest(TestCase):
    @staticmethod
    def _build_stream_response(*, body: bytes, content_type: str) -> Mock:
        response = Mock()
        response.status_code = 200
        response.headers = {"Content-Type": content_type}
        response.iter_content = Mock(return_value=[body])
        response.raise_for_status = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        return response

    @override_settings(IMPORT_ALLOWED_HOSTS=["example.com"])
    @patch("house.utils.html_parser.get_exchange_rates", return_value={"USD": 40})
    @patch("house.utils.network_security._resolve_host_ips", return_value=("93.184.216.34",))
    @patch("house.utils.network_security.requests.get")
    def test_import_property_from_url_without_gallery(
        self,
        mock_get,
        _mock_resolve,
        _mock_rates,
    ):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="100000" />
          </head>
          <body>
            <h1>Будинок в області</h1>
            <div class="address">Вінницька область, с. Приклад</div>
            <div class="pdf-area">120 м²</div>
            <div class="pdf-rooms">4</div>
            <p>Гарний двоповерховий будинок.</p>
          </body>
        </html>
        """

        listing_response = self._build_stream_response(
            body=html.encode("utf-8"),
            content_type="text/html; charset=utf-8",
        )
        mock_get.return_value = listing_response

        property_obj, warnings = import_property_from_url("https://example.com/listing")

        self.assertTrue(mock_get.called)
        self.assertIsInstance(property_obj, Property)
        self.assertEqual(warnings, [])
        self.assertEqual(property_obj.title, "Будинок в області")
        self.assertEqual(property_obj.address, "Вінницька область, с. Приклад")
        self.assertIsNotNone(property_obj.property_type)
        self.assertIsNotNone(property_obj.deal_type)

        self.assertEqual(PropertyType.objects.count(), 1)
        self.assertEqual(DealType.objects.count(), 1)

    @override_settings(
        IMPORT_ALLOWED_HOSTS=["example.com"],
        IMPORT_ALLOWED_IMAGE_HOSTS=["img.example.com"],
    )
    @patch("house.utils.html_parser.get_exchange_rates", return_value={"USD": 40})
    @patch("house.utils.network_security._resolve_host_ips", return_value=("93.184.216.34",))
    @patch("house.utils.network_security.requests.get")
    def test_import_property_from_url_deduplicates_first_image_variants(
        self,
        mock_get,
        _mock_resolve,
        _mock_rates,
    ):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="100000" />
          </head>
          <body>
            <h1>Квартира на Печерську</h1>
            <div class="address">Київ, Печерський район</div>
            <div class="pdf-area">66 м²</div>
            <div>2 кімнати</div>

            <div class="pdf-img">
              <img src="https://img.example.com/first.jpg?watermark=1" />
            </div>
            <div id="estate-images">
              <a href="https://img.example.com/first.jpg">
                <img src="https://img.example.com/first.jpg?watermark=1" />
              </a>
            </div>
          </body>
        </html>
        """

        listing_response = self._build_stream_response(
            body=html.encode("utf-8"),
            content_type="text/html; charset=utf-8",
        )

        image_buffer = BytesIO()
        Image.new("RGB", (8, 8), color=(255, 255, 255)).save(
            image_buffer, format="JPEG"
        )
        image_response = self._build_stream_response(
            body=image_buffer.getvalue(),
            content_type="image/jpeg",
        )

        def side_effect(url, timeout=None, stream=None, allow_redirects=None, headers=None):
            if url == "https://example.com/listing":
                return listing_response
            if url == "https://img.example.com/first.jpg":
                return image_response
            raise AssertionError(f"Unexpected URL requested: {url}")

        mock_get.side_effect = side_effect

        property_obj, warnings = import_property_from_url("https://example.com/listing")

        self.assertEqual(warnings, [])
        self.assertEqual(mock_get.call_count, 2)
        self.assertEqual(PropertyImage.objects.filter(property=property_obj).count(), 1)
        self.assertTrue(PropertyImage.objects.get(property=property_obj).is_main)

    @override_settings(
        IMPORT_IMAGE_PHASH_THRESHOLD=4,
        IMPORT_ALLOWED_HOSTS=["example.com"],
        IMPORT_ALLOWED_IMAGE_HOSTS=["img.example.com"],
    )
    @patch("house.utils.html_parser.get_exchange_rates", return_value={"USD": 40})
    @patch("house.utils.network_security._resolve_host_ips", return_value=("93.184.216.34",))
    @patch("house.utils.network_security.requests.get")
    def test_import_prefers_non_watermarked_when_images_are_visual_duplicates(
        self,
        mock_get,
        _mock_resolve,
        _mock_rates,
    ):
        html = """
        <html>
          <head>
            <meta itemprop="price" content="100000" />
          </head>
          <body>
            <h1>Квартира з медіагалереєю</h1>
            <div class="address">Київ, Голосіївський район</div>
            <div class="pdf-area">70 м²</div>
            <div>2 кімнати</div>

            <div class="pdf-img">
              <img src="https://img.example.com/watermark/first-main.jpg?watermark=1" />
            </div>
            <div id="estate-images">
              <a href="https://img.example.com/originals/first-clean.jpg">
                <img src="https://img.example.com/watermark/first-main.jpg?watermark=1" />
              </a>
            </div>
          </body>
        </html>
        """

        listing_response = self._build_stream_response(
            body=html.encode("utf-8"),
            content_type="text/html; charset=utf-8",
        )

        base = Image.new("RGB", (800, 600), color=(220, 220, 220))
        draw = ImageDraw.Draw(base)
        draw.rectangle((100, 100, 700, 500), fill=(130, 180, 220))
        draw.text((130, 130), "INTERIOR", fill=(20, 30, 40))

        clean_buffer = BytesIO()
        base.save(clean_buffer, format="JPEG")
        clean_response = self._build_stream_response(
            body=clean_buffer.getvalue(),
            content_type="image/jpeg",
        )

        watermarked = base.copy()
        wm_draw = ImageDraw.Draw(watermarked)
        wm_draw.rectangle((520, 520, 790, 590), fill=(255, 255, 255))
        wm_draw.text((540, 545), "DOMINIUM", fill=(80, 80, 80))
        wm_buffer = BytesIO()
        watermarked.save(wm_buffer, format="JPEG")
        watermark_response = self._build_stream_response(
            body=wm_buffer.getvalue(),
            content_type="image/jpeg",
        )

        def side_effect(
            url,
            timeout=None,
            stream=None,
            allow_redirects=None,
            headers=None,
        ):
            if url == "https://example.com/listing":
                return listing_response
            if url == "https://img.example.com/watermark/first-main.jpg?watermark=1":
                return watermark_response
            if url == "https://img.example.com/originals/first-clean.jpg":
                return clean_response
            raise AssertionError(f"Unexpected URL requested: {url}")

        mock_get.side_effect = side_effect

        property_obj, warnings = import_property_from_url("https://example.com/listing")
        self.assertEqual(warnings, [])

        images = list(PropertyImage.objects.filter(property=property_obj))
        self.assertEqual(len(images), 1)
        self.assertTrue(images[0].is_main)
        self.assertIn("first-clean", images[0].image.name)


class ImportSecurityUtilsTest(SimpleTestCase):
    def test_rejects_private_or_local_import_urls(self):
        with self.assertRaises(UnsafeImportURLError):
            ensure_safe_import_url("http://127.0.0.1/internal")
        with self.assertRaises(UnsafeImportURLError):
            ensure_safe_import_url("http://localhost/admin")

    @override_settings(
        IMPORT_REQUIRE_ALLOWED_HOSTS=True,
        IMPORT_ALLOWED_HOSTS=["cdn.riastatic.com"],
        IMPORT_ALLOWED_IMAGE_HOSTS=["cdn.riastatic.com"],
    )
    @patch(
        "house.utils.network_security._resolve_host_ips",
        return_value=("93.184.216.34",),
    )
    def test_optional_media_can_bypass_domain_allowlist_but_not_ssrf_checks(self, _mock_resolve):
        self.assertEqual(
            ensure_safe_import_url(
                "https://upload.wikimedia.org/photo.jpg",
                url_kind="image",
                enforce_allowlist=False,
            ),
            "https://upload.wikimedia.org/photo.jpg",
        )
        with self.assertRaises(UnsafeImportURLError):
            ensure_safe_import_url(
                "http://127.0.0.1/private.jpg",
                url_kind="image",
                enforce_allowlist=False,
            )

    def test_identity_key_collapses_watermark_path_variants(self):
        original = image_url_identity_key("https://img.example.com/photos/first.jpg")
        watermarked = image_url_identity_key(
            "https://img.example.com/photos/wm/first.jpg?watermark=1"
        )
        self.assertEqual(original, watermarked)

    @override_settings(
        IMPORT_REQUIRE_ALLOWED_HOSTS=True,
        IMPORT_ALLOWED_HOSTS=[],
        IMPORT_ALLOWED_IMAGE_HOSTS=[],
    )
    def test_rejects_when_allowlist_is_required_but_not_configured(self):
        with self.assertRaisesMessage(
            UnsafeImportURLError, "IMPORT_ALLOWED_HOSTS"
        ):
            ensure_safe_import_url("https://example.com/listing")

    @override_settings(
        IMPORT_REQUIRE_ALLOWED_HOSTS=True,
        IMPORT_ALLOWED_HOSTS=["example.com"],
        IMPORT_ALLOWED_IMAGE_HOSTS=["cdn.example.com"],
    )
    @patch(
        "house.utils.network_security._resolve_host_ips",
        return_value=("93.184.216.34",),
    )
    def test_image_allowlist_can_be_split_from_page_allowlist(self, _mock_resolve):
        self.assertEqual(
            ensure_safe_import_url(
                "https://example.com/listing",
                url_kind="html",
            ),
            "https://example.com/listing",
        )
        self.assertEqual(
            ensure_safe_import_url(
                "https://cdn.example.com/image.jpg",
                url_kind="image",
            ),
            "https://cdn.example.com/image.jpg",
        )
        with self.assertRaises(UnsafeImportURLError):
            ensure_safe_import_url(
                "https://img.example.com/image.jpg",
                url_kind="image",
            )

    @override_settings(
        IMPORT_REQUIRE_ALLOWED_HOSTS=True,
        IMPORT_ALLOWED_HOSTS=["*.riastatic.com"],
        IMPORT_ALLOWED_IMAGE_HOSTS=[],
    )
    @patch(
        "house.utils.network_security._resolve_host_ips",
        return_value=("93.184.216.34",),
    )
    def test_image_allowlist_falls_back_to_import_allowed_hosts(self, _mock_resolve):
        self.assertEqual(
            ensure_safe_import_url(
                "https://cdn.riastatic.com/photos/1.webp",
                url_kind="image",
            ),
            "https://cdn.riastatic.com/photos/1.webp",
        )


class PropertyModelGeoBehaviorTest(TestCase):
    def test_save_does_not_trigger_implicit_geocode(self):
        property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        deal_type = DealType.objects.create(name="Продаж")
        property_obj = Property.objects.create(
            title="Без автогеокоду",
            address="Київ, Хрещатик, 1",
            price=120000,
            area=55,
            rooms=2,
            property_type=property_type,
            deal_type=deal_type,
            latitude=None,
            longitude=None,
        )
        self.assertIsNone(property_obj.latitude)
        self.assertIsNone(property_obj.longitude)


class RealtsoftSyncTest(TestCase):
    def setUp(self):
        media_dir = TemporaryDirectory()
        self.addCleanup(media_dir.cleanup)
        media_settings = override_settings(MEDIA_ROOT=media_dir.name)
        media_settings.enable()
        self.addCleanup(media_settings.disable)

    def test_imports_sales_and_only_commercial_rentals(self):
        advertised = {"tags_cache": "Пульч Ярослава, реклама"}
        self.assertTrue(_should_import({"deal": 1, "realty_type": 1, **advertised}))
        self.assertTrue(_should_import({"deal": 2, "realty_type": 10, **advertised}))
        self.assertFalse(_should_import({"deal": 2, "realty_type": 1, **advertised}))
        self.assertFalse(_should_import({"deal": 3, "realty_type": 10, **advertised}))
        self.assertFalse(_should_import({"deal": 1, "realty_type": 1, "tags_cache": "інше"}))

    def test_existing_property_without_required_tag_is_archived_not_deleted(self):
        property_obj = Property.objects.create(
            title="Без реклами", address="Ужгород", price=100, area=10, rooms=1,
            external_source="realtsoft", external_id="777",
        )
        external = ExternalProperty.objects.create(
            crm_property_id=777, property=property_obj, source="realtsoft", is_import_eligible=True,
        )

        result = RealtsoftSyncCommand()._sync_single_item(
            Mock(), {"id": 777, "deal": 1, "realty_type": 1, "tags_cache": "інше"}, False,
            import_tag="реклама",
        )

        self.assertEqual(result, "updated")
        self.assertTrue(Property.objects.filter(pk=property_obj.pk).exists())
        property_obj.refresh_from_db()
        external.refresh_from_db()
        self.assertTrue(property_obj.is_archived)
        self.assertFalse(external.is_import_eligible)

    @patch("house.management.commands.sync_crm_properties.Command._sync_images")
    def test_required_tag_reactivates_archived_existing_property(self, _sync_images):
        property_obj = Property.objects.create(
            title="Повертається", address="Ужгород", price=100, area=10, rooms=1,
            external_source="realtsoft", external_id="778", is_archived=True,
        )
        external = ExternalProperty.objects.create(
            crm_property_id=778, property=property_obj, source="realtsoft", is_import_eligible=False,
        )
        mapped = {
            "title": property_obj.title, "description": "", "address": property_obj.address,
            "price": property_obj.price, "area": 10, "rooms": 1, "latitude": None,
            "longitude": None, "price_currency": "USD", "property_type_name": None,
            "deal_type_name": None, "images": ["https://cdn.example/photo.jpg"],
        }

        RealtsoftSyncCommand()._update_existing(
            external, mapped, {"id": 778, "tags_cache": "реклама"}, False,
            is_import_eligible=True,
        )

        property_obj.refresh_from_db()
        self.assertFalse(property_obj.is_archived)

    @override_settings(TELEGRAM_BOT_TOKEN="test-token")
    @patch("house.management.commands.send_seo_article_reminder.requests.post")
    def test_seo_article_reminder_uses_only_configured_chats(self, post):
        post.return_value.raise_for_status = Mock()
        AppSettings.set(
            "telegram",
            {
                "seo_reminder_enabled": True,
                "seo_reminder_time": "10:00",
                "seo_reminder_weekdays": [0],
                "seo_reminder_chat_ids": "111, 222",
                "seo_reminder_message": "Підготувати статтю",
            },
        )

        call_command("send_seo_article_reminder", force=True, stdout=StringIO())

        self.assertEqual(post.call_count, 2)
        self.assertEqual(
            [call.kwargs["json"]["chat_id"] for call in post.call_args_list],
            [111, 222],
        )
        self.assertTrue(AppSettings.get("seo_article_reminder_state")["last_sent_on"])

    def test_address_uses_crm_city_before_street(self):
        self.assertEqual(
            _build_address_parts(
                {"city_id": 2943, "street_name": "Занковецька", "house_num": "71"}
            ),
            ["Ужгород", "Занковецька, 71"],
        )

    @patch(
        "house.management.commands.sync_crm_properties._download_image",
        return_value=b"image",
    )
    @patch("house.management.commands.sync_crm_properties._convert_to_webp")
    def test_prepares_all_available_crm_images(self, convert_image, download_image):
        convert_image.side_effect = lambda _data, name: ContentFile(
            b"webp", name=f"{name}.webp"
        )
        urls = [f"https://cdn.example/{index}.jpg" for index in range(1, 22)]

        prepared = _prepare_images(123, urls)

        self.assertEqual(len(prepared), 21)
        self.assertEqual(download_image.call_count, 21)
        self.assertEqual(
            [image.name for image in prepared],
            [f"crm_123_{index}.webp" for index in range(21)],
        )

    @patch(
        "house.management.commands.sync_crm_properties._download_image",
        return_value=b"image",
    )
    @patch("house.management.commands.sync_crm_properties._convert_to_webp")
    def test_existing_property_gets_missing_images_without_redownloading_existing_ones(
        self, convert_image, download_image
    ):
        property_type = PropertyType.objects.create(name="Квартира", slug="flat")
        deal_type = DealType.objects.create(name="Продаж")
        property_obj = Property.objects.create(
            title="Фото тест",
            address="Ужгород",
            price=100,
            area=50,
            rooms=2,
            property_type=property_type,
            deal_type=deal_type,
            external_source="realtsoft",
            external_id="123",
        )
        # Старі синхронізації іменували фото локальним ID об'єкта.
        PropertyImage.objects.create(
            property=property_obj,
            image=f"property_images/crm_{property_obj.id}_0.webp",
            is_main=True,
            sort_order=1,
        )
        external = ExternalProperty.objects.create(
            crm_property_id=123,
            property=property_obj,
            source="realtsoft",
        )
        convert_image.side_effect = lambda _data, name: ContentFile(
            b"webp", name=f"{name}.webp"
        )
        mapped = {
            "title": property_obj.title,
            "description": property_obj.description,
            "address": property_obj.address,
            "price": property_obj.price,
            "area": property_obj.area,
            "rooms": property_obj.rooms,
            "latitude": property_obj.latitude,
            "longitude": property_obj.longitude,
            "price_currency": property_obj.price_currency,
            "property_type_name": property_type.name,
            "deal_type_name": deal_type.name,
            "images": [f"https://cdn.example/{index}.jpg" for index in range(1, 22)],
        }

        command = RealtsoftSyncCommand()
        self.assertEqual(command._update_existing(external, mapped, {"id": 123}, False), "unchanged")

        self.assertEqual(
            list(
                PropertyImage.objects.filter(property=property_obj)
                .order_by("sort_order")
                .values_list("sort_order", flat=True)
            ),
            list(range(1, 22)),
        )
        self.assertEqual(download_image.call_count, 20)
        self.assertEqual(
            [call.args[0] for call in download_image.call_args_list],
            mapped["images"][1:],
        )

        download_image.reset_mock()
        self.assertEqual(command._update_existing(external, mapped, {"id": 123}, False), "unchanged")
        self.assertEqual(download_image.call_count, 0)
        self.assertEqual(PropertyImage.objects.filter(property=property_obj).count(), 21)

        self.assertEqual(
            command._update_existing(
                external,
                mapped,
                {"id": 123, "responsible_user_id": 49},
                False,
                manager_user_id=49,
                manager_name="Пульч Ярослава",
            ),
            "updated",
        )
        external.refresh_from_db()
        self.assertEqual(external.crm_manager_user_id, 49)
        self.assertEqual(external.crm_manager_name, "Пульч Ярослава")

    @patch(
        "house.management.commands.sync_crm_properties._download_image",
        return_value=None,
    )
    def test_new_property_is_not_created_when_no_photo_can_be_downloaded(self, _download):
        mapped = {
            "title": "Об'єкт без доступного фото",
            "description": "",
            "address": "Ужгород",
            "price": 100,
            "area": 10,
            "rooms": 1,
            "latitude": None,
            "longitude": None,
            "property_type_name": "Квартира",
            "deal_type_name": "Продаж",
            "price_currency": "USD",
            "images": ["https://cdn.example.invalid/photo.jpg"],
        }

        result = RealtsoftSyncCommand()._create_new(
            Mock(url="https://crm.example.invalid"),
            123,
            mapped,
            {"id": 123},
            False,
        )

        self.assertEqual(result, "skipped")
        self.assertFalse(Property.objects.exists())


class RealtsoftDailyReportTest(TestCase):
    @override_settings(TELEGRAM_BOT_TOKEN="test-token")
    @patch("house.management.commands.report_crm_daily.requests.Session")
    def test_daily_report_is_sent_to_each_configured_chat(self, session_factory):
        response = Mock()
        response.json.return_value = {"ok": True}
        client = Mock()
        client.post.return_value = response
        http_context = MagicMock()
        http_context.__enter__.return_value = client
        session_factory.return_value = http_context

        with patch.dict("os.environ", {"TELEGRAM_REPORT_CHAT_IDS": "11,22"}):
            call_command("report_crm_daily", stdout=StringIO())

        sent_chat_ids = [
            call.kwargs["json"]["chat_id"] for call in client.post.call_args_list
        ]
        self.assertEqual(sent_chat_ids, [11, 22, 7679436754])
