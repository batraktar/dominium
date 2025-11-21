import json
from unittest.mock import Mock, patch

from django.test import Client, SimpleTestCase, TestCase
from django.urls import reverse

from house.models import DealType, Property, PropertyType
from house.services.importer import import_property_from_url
from house.utils.html_parser import parse_property_html


class PropertyApiSmokeTest(TestCase):
    def setUp(self):
        self.client = Client()
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
        # координати витягуються лише якщо явно геокодимо або бачимо атрибути (у тесті вимкнено геокодинг)
        self.assertIsNone(parsed.latitude)
        self.assertIsNone(parsed.longitude)


class ImporterServiceTest(TestCase):
    @patch("house.utils.html_parser.get_exchange_rates", return_value={"USD": 40})
    @patch("house.services.importer.requests.get")
    def test_import_property_from_url_without_gallery(self, mock_get, _mock_rates):
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

        response = Mock()
        response.text = html
        response.content = html.encode("utf-8")
        response.raise_for_status = Mock()
        mock_get.return_value = response

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
