from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.core.cache import cache
from unittest.mock import patch

from django.test import Client, TestCase, override_settings
from django.urls import reverse
from allauth.socialaccount.models import SocialApp

from accounts.services.google_identity import GoogleIdentity, GoogleIdentityError


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


@override_settings(GOOGLE_CLIENT_ID="dominium-client.apps.googleusercontent.com")
class GoogleCredentialLoginTests(TestCase):
    def _csrf_client(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get(reverse("house_api:csrf_token")).json()["csrfToken"]
        return client, token

    def test_config_exposes_only_public_client_id(self):
        response = self.client.get(reverse("google_identity_config"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "enabled": True,
                "client_id": "dominium-client.apps.googleusercontent.com",
            },
        )
        self.assertIn("https://accounts.google.com", response["Content-Security-Policy"])
        self.assertIn(
            "frame-src https://accounts.google.com",
            response["Content-Security-Policy"],
        )

    @patch("dominium_backend.views.auth.verify_google_identity")
    def test_verified_credential_creates_user_and_session(self, verify):
        verify.return_value = GoogleIdentity(
            subject="google-subject-1",
            email="olena@example.com",
            full_name="Олена Тест",
        )
        client, token = self._csrf_client()

        response = client.post(
            reverse("google_identity_login"),
            data='{"credential":"signed-google-token"}',
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["user"]["is_authenticated"])
        user = get_user_model().objects.get(email="olena@example.com")
        self.assertEqual(user.full_name, "Олена Тест")
        self.assertTrue(user.is_email_verified)
        self.assertEqual(user.socialaccount_set.get(provider="google").uid, "google-subject-1")
        self.assertEqual(client.session.get("_auth_user_id"), str(user.pk))

    @patch("dominium_backend.views.auth.verify_google_identity")
    def test_existing_verified_email_is_reused_without_losing_staff(self, verify):
        existing = get_user_model().objects.create_user(
            username="existing-staff",
            email="staff@example.com",
            is_staff=True,
        )
        verify.return_value = GoogleIdentity(
            subject="google-subject-staff",
            email="staff@example.com",
            full_name="Staff Name",
        )
        client, token = self._csrf_client()

        response = client.post(
            reverse("google_identity_login"),
            data='{"credential":"signed-google-token"}',
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(get_user_model().objects.filter(email="staff@example.com").count(), 1)
        existing.refresh_from_db()
        self.assertTrue(existing.is_staff)
        self.assertEqual(response.json()["user"]["email"], "staff@example.com")

    @patch("dominium_backend.views.auth.verify_google_identity")
    def test_invalid_or_unverified_credential_does_not_create_session(self, verify):
        verify.side_effect = GoogleIdentityError("invalid credential")
        client, token = self._csrf_client()

        response = client.post(
            reverse("google_identity_login"),
            data='{"credential":"invalid"}',
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "google_credential_invalid")
        self.assertNotIn("_auth_user_id", client.session)
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_google_login_requires_csrf(self):
        client = Client(enforce_csrf_checks=True)

        response = client.post(
            reverse("google_identity_login"),
            data='{"credential":"signed-google-token"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    @override_settings(LOGIN_RATE_LIMIT=2, LOGIN_RATE_WINDOW=60)
    @patch("dominium_backend.views.auth.verify_google_identity")
    def test_google_login_is_rate_limited_without_verifying_more_tokens(self, verify):
        cache.clear()
        verify.side_effect = GoogleIdentityError("invalid credential")
        client, token = self._csrf_client()
        for expected in (400, 400, 429):
            response = client.post(
                reverse("google_identity_login"),
                data='{"credential":"invalid"}',
                content_type="application/json",
                HTTP_X_CSRFTOKEN=token,
            )
            self.assertEqual(response.status_code, expected)
        self.assertEqual(verify.call_count, 2)

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

    def test_allauth_post_starts_google_flow_directly(self):
        with self.settings(SOCIALACCOUNT_LOGIN_ON_GET=False):
            client = Client(enforce_csrf_checks=True)
            csrf_response = client.get(reverse("house_api:csrf_token"))
            response = client.post(
                "/accounts/google/login/?process=login&next=%2Fsearch%2F",
                {"csrfmiddlewaretoken": csrf_response.json()["csrfToken"]},
            )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            response["Location"].startswith("https://accounts.google.com/"),
            response.get("Location", "No provider redirect returned"),
        )

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
