from __future__ import annotations

from io import StringIO
from unittest.mock import Mock, patch

import requests
from allauth.socialaccount.models import SocialApp
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from accounts.models import CustomUser
from house.models import AppSettings
from house.services.realtsoft_client import (
    RealtsoftAPIError,
    RealtsoftClient,
    get_realtsoft_client,
)


class RealtsoftClientTest(SimpleTestCase):
    @patch("house.services.realtsoft_client.requests.get")
    @patch("house.services.realtsoft_client.requests.request")
    def test_call_uses_tls_verification_and_raises_for_http_error(
        self, request: Mock, get: Mock
    ) -> None:
        response = Mock()
        response.status_code = 401
        response.raise_for_status.side_effect = requests.HTTPError(response=response)
        request.return_value = response
        get.return_value = response
        client = RealtsoftClient(
            url="https://project.realtsoft.net",
            key="api-key",
            secret="secret-key",
        )

        with self.assertRaises(RealtsoftAPIError) as raised:
            client.search_estate(page=1, per_page=1)

        self.assertEqual(raised.exception.status_code, 401)
        request.assert_called_once()
        self.assertTrue(request.call_args.kwargs["verify"])


class RealtsoftSyncCommandTest(TestCase):
    @override_settings(REALTSOFT_SYNC_ENABLED=True)
    @patch("house.management.commands.sync_crm_properties.get_realtsoft_client")
    def test_sync_returns_failure_exit_when_api_request_fails(
        self, get_client: Mock
    ) -> None:
        client = Mock()
        client.search_estate.side_effect = RealtsoftAPIError("connection failed")
        get_client.return_value = client

        with self.assertRaises(CommandError):
            call_command(
                "sync_crm_properties",
                max_pages=1,
                per_page=1,
                stdout=StringIO(),
                stderr=StringIO(),
            )


class IntegrationSettingsApiTest(TestCase):
    def setUp(self) -> None:
        self.user = CustomUser.objects.create_user(
            username="integration-admin",
            password="test-password",
            is_staff=True,
        )
        self.client.force_login(self.user)

    @override_settings(
        REALTSOFT_CRM_URL="https://env.realtsoft.net",
        REALTSOFT_API_KEY="env-key",
        REALTSOFT_SECRET_KEY="env-secret",
    )
    def test_saved_crm_settings_drive_the_server_side_client(self) -> None:
        AppSettings.set(
            "crm",
            {
                "url": "https://admin.realtsoft.net",
                "api_key": "admin-key",
                "secret_key": "admin-secret",
                "enabled": True,
                "sync_interval": 30,
            },
        )

        realtsoft = get_realtsoft_client()

        self.assertEqual(realtsoft.url, "https://admin.realtsoft.net")
        self.assertEqual(realtsoft.key, "admin-key")
        self.assertEqual(realtsoft.secret, "admin-secret")

    @patch("house.api.views.get_realtsoft_client")
    def test_crm_connection_endpoint_checks_realtsoft_not_local_properties(
        self, get_client: Mock
    ) -> None:
        realtsoft = Mock()
        realtsoft.url = "https://admin.realtsoft.net"
        realtsoft.search_estate.return_value = [{"id": 1}]
        get_client.return_value = realtsoft

        response = self.client.post(reverse("house_api:realtsoft_connection_test"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["result"]["ok"])
        realtsoft.search_estate.assert_called_once_with(page=1, per_page=1)

    def test_google_oauth_settings_are_saved_and_secrets_are_masked(self) -> None:
        response = self.client.post(
            reverse("house_api:app_settings"),
            data={
                "key": "google",
                "value": {
                    "client_id": "google-client-id",
                    "secret_key": "google-secret",
                },
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        google_app = SocialApp.objects.get(provider="google")
        self.assertEqual(google_app.client_id, "google-client-id")
        self.assertEqual(google_app.secret, "google-secret")

        settings_response = self.client.get(reverse("house_api:app_settings"))
        google = settings_response.json()["result"]["google"]
        self.assertEqual(google["client_id"], "google-client-id")
        self.assertEqual(google["secret_key"], "")
        self.assertTrue(google["has_secret_key"])
        self.assertIn("/accounts/google/login/callback/", google["callback_url"])
