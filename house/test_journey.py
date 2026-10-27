import json
import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from house.models import JourneyEvent, JourneySession, Property
from house.management.commands.anonymize_journey_ips import anonymize_ip


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

    def test_ip_anonymization_preserves_only_network_prefix(self):
        self.assertEqual(anonymize_ip("203.0.113.77"), "203.0.113.0")
        self.assertEqual(anonymize_ip("2001:db8:abcd:1234::1"), "2001:db8:abcd::")

    def test_records_server_context_and_tab_identity_without_trusting_metadata(self):
        payload = self.payload(
            visitor_id="visitor-123",
            tab_id="tab-456",
            metadata={"ip": "198.51.100.9", "user_agent": "forged"},
        )
        response = self.client.post(
            reverse("journey_event"),
            json.dumps(payload),
            content_type="application/json",
            REMOTE_ADDR="203.0.113.7",
            HTTP_USER_AGENT="Mozilla/5.0 Test Browser",
        )

        self.assertEqual(response.status_code, 201)
        session = JourneySession.objects.get()
        event = JourneyEvent.objects.get()
        self.assertEqual(session.visitor_id, "visitor-123")
        self.assertEqual(session.ip_address, "203.0.113.7")
        self.assertEqual(session.user_agent, "Mozilla/5.0 Test Browser")
        self.assertEqual(event.tab_id, "tab-456")
        self.assertNotIn("ip", event.metadata)

    def test_backfills_new_identity_fields_for_an_existing_visit(self):
        session = JourneySession.objects.create(session_id="legacy-visit")
        response = self.client.post(
            reverse("journey_event"),
            json.dumps(self.payload(
                session_id=session.session_id,
                visitor_id="visitor-backfilled",
                tab_id="tab-backfilled",
            )),
            content_type="application/json",
            REMOTE_ADDR="203.0.113.22",
            HTTP_USER_AGENT="Existing Browser",
        )

        self.assertEqual(response.status_code, 201)
        session.refresh_from_db()
        self.assertEqual(session.visitor_id, "visitor-backfilled")
        self.assertEqual(session.ip_address, "203.0.113.22")
        self.assertEqual(session.user_agent, "Existing Browser")

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
        url = reverse("property_presentation", args=[self.property.slug])
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_login(self.staff)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Завантажити PDF")
        self.assertContains(response, "Друкувати")
        self.assertNotContains(response, 'onclick="')
        self.assertContains(response, 'nonce="')
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_authenticated_event_links_session_to_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("journey_event"), json.dumps(self.payload()), content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(JourneySession.objects.get().user, self.user)

    def test_successful_consultation_links_contact_to_journey_session(self):
        session = JourneySession.objects.create(session_id="consultation-session")
        with self.settings(TELEGRAM_BOT_TOKEN="token", TELEGRAM_CHAT_IDS=[1]):
            from unittest.mock import patch
            with patch("dominium_backend.views.public.requests.post") as send:
                send.return_value.raise_for_status.return_value = None
                response = self.client.post(reverse("consultation_api"), {
                    "name": "Олена",
                    "phone": "+380 67 123 45 67",
                    "email": "OLENA@example.com",
                    "message": "Хочу консультацію",
                    "journey_session_id": session.session_id,
                })
        self.assertEqual(response.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.customer_name, "Олена")
        self.assertEqual(session.customer_phone, "+380671234567")
        self.assertEqual(session.customer_email, "olena@example.com")

    def test_staff_analytics_exposes_linked_contact_only_to_staff(self):
        session = JourneySession.objects.create(
            session_id="known-contact", customer_name="Іван", customer_phone="+380501112233"
        )
        JourneyEvent.objects.create(
            event_id=uuid.uuid4(), session=session, event_type="page_view", path="/"
        )
        self.client.force_login(self.staff)
        payload = self.client.get(reverse("journey_analytics")).json()
        known = next(item for item in payload["journeys"] if item["session_id"] == "-contact")
        self.assertEqual(known["customer"]["name"], "Іван")
        self.assertEqual(known["customer"]["phone"], "+380501112233")

    def test_staff_analytics_returns_unique_session_funnel_and_continuous_daily_trend(self):
        sessions = [JourneySession.objects.create(session_id=f"funnel-{index}") for index in range(3)]
        event_types = [
            (sessions[0], "property_view"),
            (sessions[0], "favorite"),
            (sessions[0], "consultation"),
            (sessions[1], "property_view"),
            (sessions[1], "property_view"),
            (sessions[2], "page_view"),
        ]
        for session, event_type in event_types:
            JourneyEvent.objects.create(
                event_id=uuid.uuid4(), session=session, event_type=event_type, path="/"
            )

        self.client.force_login(self.staff)
        payload = self.client.get(reverse("journey_analytics"), {"period": 7}).json()

        self.assertEqual(
            payload["funnel"],
            [
                {"key": "sessions", "label": "Сесії", "value": 3},
                {"key": "property_view", "label": "Переглянули об’єкт", "value": 2},
                {"key": "intent", "label": "Виявили намір", "value": 1},
                {"key": "consultation", "label": "Залишили заявку", "value": 1},
            ],
        )
        self.assertEqual(len(payload["daily"]), 7)
        self.assertEqual(
            payload["daily"][-1],
            {"date": payload["daily"][-1]["date"], "sessions": 3, "property_views": 2, "consultations": 1},
        )
        self.assertTrue(all(item["sessions"] == 0 for item in payload["daily"][:-1]))

    def test_staff_analytics_groups_visits_by_visitor_and_exposes_tab_timeline(self):
        first = JourneySession.objects.create(
            session_id="visit-one", visitor_id="visitor-shared", ip_address="203.0.113.7",
            user_agent="Mozilla/5.0 Test",
        )
        second = JourneySession.objects.create(
            session_id="visit-two", visitor_id="visitor-shared", ip_address="203.0.113.7",
        )
        JourneyEvent.objects.create(
            event_id=uuid.uuid4(), session=first, tab_id="tab-a", event_type="page_view", path="/articles/test/"
        )
        JourneyEvent.objects.create(
            event_id=uuid.uuid4(), session=second, tab_id="tab-b", event_type="favorite", path="/property/test/"
        )

        self.client.force_login(self.staff)
        payload = self.client.get(reverse("journey_analytics"), {"period": 7}).json()

        self.assertEqual(payload["overview"]["visitors"], 1)
        visitor = next(row for row in payload["visitors"] if row["visitor_id"] == "visitor-shared")
        self.assertEqual(visitor["visit_count"], 2)
        self.assertEqual(visitor["tab_count"], 2)
        self.assertEqual(visitor["ip_address"], "203.0.113.7")
        self.assertEqual([event["tab_id"] for event in visitor["events"]], ["tab-a", "tab-b"])
