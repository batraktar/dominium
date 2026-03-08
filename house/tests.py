import json
from io import BytesIO
from unittest.mock import Mock, patch

from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from PIL import Image, ImageDraw

from accounts.models import CustomUser
from house.models import DealType, Property, PropertyImage, PropertyType
from house.services.importer import import_property_from_url
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

    @override_settings(IMPORT_IMAGE_PHASH_THRESHOLD=4)
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
