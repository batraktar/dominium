import json
import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from house.models import JourneyEvent, JourneySession, Property


class JourneyApiTests(TestCase):
    def setUp(self):
        self.property = Property.objects.create(
            title="Тестовий будинок", address="Ужгород", price=100000, area=120, rooms=4
        )
        user_model = get_user_model()
        self.staff = user_model.objects.create_user(username="staff-journey", email="staff-journey@example.com", password="test", is_staff=True)
        self.user = user_model.objects.create_user(username="user-journey", email="user-journey@example.com", password="test")

    def payload(self, **updates):
        payload = {
            "event_id": str(uuid.uuid4()),
            "session_id": str(uuid.uuid4()),
            "event_type": "property_view",
            "path": self.property.get_absolute_url(),
            "property_id": self.property.id,
            "attribution": {"utm_source": "google", "utm_campaign": "autumn"},
        }
        payload.update(updates)
        return payload

    def test_records_and_deduplicates_event(self):
        payload = self.payload()
        first = self.client.post(reverse("journey_event"), json.dumps(payload), content_type="application/json")
        second = self.client.post(reverse("journey_event"), json.dumps(payload), content_type="application/json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(JourneyEvent.objects.count(), 1)
        self.assertEqual(JourneySession.objects.get().utm_source, "google")

    def test_rejects_external_path_and_arbitrary_metadata(self):
        response = self.client.post(
            reverse("journey_event"), json.dumps(self.payload(path="https://evil.example/a")), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

        payload = self.payload(event_type="search", metadata={"query": "дім", "email": "hidden@example.com"})
        self.client.post(reverse("journey_event"), json.dumps(payload), content_type="application/json")
        self.assertEqual(JourneyEvent.objects.get().metadata, {"query": "дім"})

    def test_analytics_is_staff_only(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse("journey_analytics")).status_code, 403)
        self.client.force_login(self.staff)
        response = self.client.get(reverse("journey_analytics"), {"period": 28})
        self.assertEqual(response.status_code, 200)
        self.assertIn("journeys", response.json())

    def test_presentation_is_staff_only_and_private(self):
        url = reverse("property_presentation", args=[self.property.id])
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_login(self.staff)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Зберегти як PDF")
        self.assertNotContains(response, 'onclick="')
        self.assertContains(response, 'nonce="')
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")
        self.assertEqual(response["Cache-Control"], "private, no-store")
