from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class GooglePopupCompleteViewTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="popup-user",
            email="popup@example.com",
            password="StrongPass123!",
        )

    def test_authenticated_success_payload_and_header(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("google_popup_complete"),
            {
                "next": "/property/test-slug/",
                "parent_origin": "http://localhost:5173",
                "popup_state": "state123",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")

        content = response.content.decode("utf-8")
        self.assertIn("dominium-auth-success", content)
        self.assertIn("test\\u002Dslug", content)
        self.assertIn("http://localhost:5173", content)
        self.assertIn("state123", content)

    def test_external_next_is_normalized_to_root(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("google_popup_complete"),
            {
                "next": "https://evil.example/phishing",
            },
        )

        content = response.content.decode("utf-8")
        self.assertIn('const nextPath = "/"', content)
        self.assertNotIn("evil.example", content)

    def test_anonymous_flow_emits_failed_payload(self):
        response = self.client.get(
            reverse("google_popup_complete"),
            {
                "next": "/likes/",
            },
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("dominium-auth-failed", content)
        self.assertIn("/likes/", content)

    def test_invalid_parent_origin_is_dropped(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("google_popup_complete"),
            {
                "parent_origin": "javascript:alert(1)",
            },
        )

        content = response.content.decode("utf-8")
        self.assertIn('const explicitOrigin = ""', content)
        self.assertNotIn("javascript:alert", content)
