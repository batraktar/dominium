import json
from datetime import date
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from dominium_backend.services.search_console import (
    READONLY_SCOPE,
    SearchConsoleNotConfigured,
    get_search_performance,
)
from house.models import SearchConsoleSettings


class SearchConsoleServiceTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(
        GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON=json.dumps(
            {"type": "service_account", "client_email": "search@example.invalid"}
        ),
        GOOGLE_SEARCH_CONSOLE_SITE_URL="sc-domain:dominium.com.ua",
        GOOGLE_SEARCH_CONSOLE_CACHE_SECONDS=900,
    )
    @patch("dominium_backend.services.search_console.AuthorizedSession")
    @patch("dominium_backend.services.search_console.service_account.Credentials.from_service_account_info")
    def test_uses_readonly_credentials_normalizes_queries_and_caches(self, credentials_from_info, session_class):
        credentials = Mock()
        credentials_from_info.return_value = credentials
        session = session_class.return_value
        responses = [
            {"rows": [{"clicks": 30, "impressions": 300, "ctr": 0.1, "position": 4.5}], "metadata": {"first_incomplete_date": "2026-10-21"}},
            {"rows": [{"keys": ["2026-10-20"], "clicks": 3, "impressions": 30, "ctr": 0.1, "position": 5}]},
            {"rows": [{"keys": ["купити дім"], "clicks": 8, "impressions": 50, "ctr": 0.16, "position": 2}]},
            {"rows": [{"keys": ["https://dominium.com.ua/property/a/"], "clicks": 7, "impressions": 40, "ctr": 0.175, "position": 3}]},
        ]
        session.post.side_effect = [self._response(item) for item in responses]

        result = get_search_performance(28, today=date(2026, 10, 23))
        cached = get_search_performance(28, today=date(2026, 10, 23))

        credentials_from_info.assert_called_once_with(
            {"type": "service_account", "client_email": "search@example.invalid"},
            scopes=[READONLY_SCOPE],
        )
        self.assertEqual(session.post.call_count, 4)
        payloads = [call.kwargs["json"] for call in session.post.call_args_list]
        self.assertEqual(payloads[0]["startDate"], "2026-09-26")
        self.assertEqual(payloads[0]["endDate"], "2026-10-23")
        self.assertEqual([payload.get("dimensions", []) for payload in payloads], [[], ["date"], ["query"], ["page"]])
        self.assertEqual(result["metrics"]["clicks"], 30)
        self.assertEqual(result["daily"][0]["date"], "2026-10-20")
        self.assertEqual(result["top_queries"][0]["query"], "купити дім")
        self.assertEqual(result["top_pages"][0]["page"], "https://dominium.com.ua/property/a/")
        self.assertEqual(result["incomplete_from"], "2026-10-21")
        self.assertEqual(cached, result)

    def test_rejects_unsupported_period(self):
        with self.assertRaises(ValueError):
            get_search_performance(14)

    @override_settings(
        GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON="env-secret",
        GOOGLE_SEARCH_CONSOLE_SITE_URL="sc-domain:env.invalid",
    )
    @patch("dominium_backend.services.search_console.AuthorizedSession")
    @patch("dominium_backend.services.search_console.service_account.Credentials.from_service_account_info")
    def test_django_admin_configuration_takes_precedence_over_env(self, credentials_from_info, session_class):
        SearchConsoleSettings.objects.create(
            site_url="sc-domain:dominium.com.ua",
            service_account_json=json.dumps({"type": "service_account", "client_email": "admin@example.invalid"}),
            cache_seconds=60,
        )
        session_class.return_value.post.side_effect = [self._response({"rows": []}) for _ in range(4)]
        get_search_performance(7, today=date(2026, 10, 23))
        credentials_from_info.assert_called_once_with(
            {"type": "service_account", "client_email": "admin@example.invalid"},
            scopes=[READONLY_SCOPE],
        )

    @override_settings(
        GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON="",
        GOOGLE_SEARCH_CONSOLE_SITE_URL="",
    )
    def test_missing_configuration_has_safe_exception(self):
        with self.assertRaisesRegex(SearchConsoleNotConfigured, "not configured"):
            get_search_performance(28)

    @override_settings(
        GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON="{not-json",
        GOOGLE_SEARCH_CONSOLE_SITE_URL="sc-domain:dominium.com.ua",
    )
    def test_malformed_credentials_do_not_echo_secret(self):
        with self.assertRaises(SearchConsoleNotConfigured) as caught:
            get_search_performance(28)
        self.assertNotIn("not-json", str(caught.exception))

    @staticmethod
    def _response(payload):
        response = Mock(status_code=200)
        response.json.return_value = payload
        return response


class SearchConsoleEndpointTests(TestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username="search-staff", email="staff@example.invalid", password="test-password", is_staff=True
        )
        self.user = get_user_model().objects.create_user(
            username="search-user", email="user@example.invalid", password="test-password"
        )

    def test_endpoint_is_staff_only(self):
        self.assertEqual(self.client.get(reverse("search_console_performance")).status_code, 404)
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse("search_console_performance")).status_code, 404)

    @override_settings(GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON="")
    def test_staff_sees_not_configured_state_and_period_validation(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("search_console_performance"), {"period": "28"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "not_configured"})
        invalid = self.client.get(reverse("search_console_performance"), {"period": "14"})
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.json()["error"], "unsupported_period")

    @patch("dominium_backend.views.admin.get_search_performance")
    def test_staff_gets_normalized_data_and_safe_upstream_error(self, get_performance):
        self.client.force_login(self.staff)
        get_performance.return_value = {"status": "ok", "metrics": {"clicks": 1}}
        response = self.client.get(reverse("search_console_performance"), {"period": "7"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["metrics"]["clicks"], 1)
        get_performance.assert_called_once_with(7)

        get_performance.side_effect = RuntimeError("credential-private-key")
        failed = self.client.get(reverse("search_console_performance"), {"period": "90"})
        self.assertEqual(failed.status_code, 502)
        self.assertEqual(failed.json(), {"status": "unavailable"})
        self.assertNotIn("credential-private-key", failed.content.decode())


class SearchConsoleDjangoAdminTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            username="gsc-admin", email="gsc-admin@example.invalid", password="test-password"
        )
        self.client.force_login(self.admin)

    def test_saved_secret_is_not_rendered_and_blank_edit_preserves_it(self):
        saved = SearchConsoleSettings.objects.create(
            site_url="sc-domain:dominium.com.ua",
            service_account_json='{"type":"service_account","private_key":"DO-NOT-RENDER"}',
            cache_seconds=900,
        )
        change_url = reverse("admin:house_searchconsolesettings_change", args=[saved.pk])
        page = self.client.get(change_url)
        self.assertEqual(page.status_code, 200)
        self.assertNotContains(page, "DO-NOT-RENDER")

        response = self.client.post(
            change_url,
            {"site_url": "sc-domain:dominium.com.ua", "service_account_json": "", "cache_seconds": "600"},
        )
        self.assertEqual(response.status_code, 302, response.content)
        saved.refresh_from_db()
        self.assertIn("DO-NOT-RENDER", saved.service_account_json)
        self.assertEqual(saved.cache_seconds, 600)

    def test_admin_rejects_non_service_account_json(self):
        add_url = reverse("admin:house_searchconsolesettings_add")
        response = self.client.post(
            add_url,
            {"site_url": "sc-domain:dominium.com.ua", "service_account_json": '{"type":"authorized_user"}', "cache_seconds": "900"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Потрібен JSON ключа Google service account")
        self.assertFalse(SearchConsoleSettings.objects.exists())
