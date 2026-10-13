from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.test import TestCase
from django.urls import reverse
from allauth.socialaccount.models import SocialApp


class AuthSessionViewTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="session-user",
            email="session@example.com",
            password="StrongPass123!",
            full_name="Session User",
            phone_number="+380501234567",
        )

    def test_anonymous_session_is_uncached_and_contains_no_user_data(self):
        response = self.client.get(reverse("auth_session"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("no-store", response["Cache-Control"])
        self.assertIn("Cookie", response["Vary"])
        self.assertEqual(
            response.json(),
            {
                "is_authenticated": False,
                "is_staff": False,
                "display_name": "",
                "email": "",
                "phone": "",
            },
        )

    def test_authenticated_session_returns_user_for_static_spa(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("auth_session"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "is_authenticated": True,
                "is_staff": False,
                "display_name": "Session User",
                "email": "session@example.com",
                "phone": "+380501234567",
            },
        )


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
        self.assertEqual(
            response["Cross-Origin-Opener-Policy"], "same-origin-allow-popups"
        )

        content = response.content.decode("utf-8")
        self.assertIn("dominium-auth-success", content)
        self.assertIn("test\\u002Dslug", content)
        self.assertIn("http://localhost:5173", content)
        self.assertIn("state123", content)
        self.assertIn("dominium:google-auth:", content)
        self.assertIn("localStorage.setItem", content)

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


class GooglePopupStartViewTests(TestCase):
    def setUp(self):
        app = SocialApp.objects.create(
            provider="google",
            name="Google test app",
            client_id="google-test-client",
            secret="google-test-secret",
        )
        app.sites.add(Site.objects.get_current())

    def test_previous_popup_urls_remain_compatible(self):
        start = self.client.get("/auth/google-popup-start/", {"next": "/search/"})
        complete = self.client.get(
            "/auth/popup-complete/",
            {
                "next": "/search/",
                "parent_origin": "https://dominium.com.ua",
                "popup_state": "state123",
            },
        )

        self.assertEqual(start.status_code, 200)
        self.assertEqual(complete.status_code, 200)

    def test_renders_post_bridge_with_csrf_and_callback_state(self):
        response = self.client.get(
            reverse("google_popup_start"),
            {
                "next": "/property/test-slug/?from=search",
                "parent_origin": "https://dominium.com.ua",
                "popup_state": "state123",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("no-store", response["Cache-Control"])
        content = response.content.decode("utf-8")
        self.assertIn('method="post"', content)
        self.assertIn('name="csrfmiddlewaretoken"', content)
        self.assertIn("/accounts/google/login/?process=login", content)
        self.assertIn("parent_origin%3Dhttps%253A%252F%252Fdominium.com.ua", content)
        self.assertIn("popup_state%3Dstate123", content)
        self.assertIn("requestSubmit()", content)

    def test_missing_popup_state_uses_normal_full_page_callback(self):
        response = self.client.get(
            reverse("google_popup_start"),
            {"next": "/search/?deal=sale"},
        )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("next=%2Fsearch%2F%3Fdeal%3Dsale", content)
        self.assertNotIn("google-popup-complete", content)

    def test_homepage_google_buttons_use_popup_start_bridge(self):
        response = self.client.get(reverse("start_page"))

        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertGreaterEqual(
            content.count('data-auth-url="/accounts/google-popup-start/"'), 3
        )
        self.assertNotIn("/auth/popup-complete/", content)

    def test_google_login_confirmation_uses_dominium_popup_template(self):
        with self.settings(SOCIALACCOUNT_LOGIN_ON_GET=False):
            response = self.client.get(
                "/accounts/google/login/",
                {"process": "login", "next": "/search/"},
            )

        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertIn("Вхід через Google", content)
        self.assertIn("DOMINIUM", content)
        self.assertIn("background: radial-gradient", content)
        self.assertIn('name="csrfmiddlewaretoken"', content)
