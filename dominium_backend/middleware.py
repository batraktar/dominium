from __future__ import annotations

import base64
import secrets

from django.conf import settings


class ContentSecurityPolicyMiddleware:
    """
    Adds security headers (CSP + browser hardening defaults).
    Policies are configurable via environment-backed Django settings.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        nonce = base64.b64encode(secrets.token_bytes(16)).decode("ascii")
        request.csp_nonce = nonce

        response = self.get_response(request)
        csp_policy = str(getattr(settings, "CONTENT_SECURITY_POLICY", "") or "").strip()
        csp_report_only = str(
            getattr(settings, "CONTENT_SECURITY_POLICY_REPORT_ONLY", "") or ""
        ).strip()

        if csp_policy:
            csp_policy = csp_policy.replace("{nonce}", nonce)
        if csp_report_only:
            csp_report_only = csp_report_only.replace("{nonce}", nonce)

        if csp_policy and "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = csp_policy
        if csp_report_only and "Content-Security-Policy-Report-Only" not in response:
            response["Content-Security-Policy-Report-Only"] = csp_report_only

        static_security_headers = (
            ("Permissions-Policy", getattr(settings, "PERMISSIONS_POLICY", "")),
            (
                "Cross-Origin-Resource-Policy",
                getattr(settings, "CROSS_ORIGIN_RESOURCE_POLICY", ""),
            ),
            (
                "X-Permitted-Cross-Domain-Policies",
                getattr(settings, "X_PERMITTED_CROSS_DOMAIN_POLICIES", ""),
            ),
            ("Origin-Agent-Cluster", getattr(settings, "ORIGIN_AGENT_CLUSTER", "")),
        )

        for header_name, header_value in static_security_headers:
            clean_value = str(header_value or "").strip()
            if clean_value and header_name not in response:
                response[header_name] = clean_value

        return response
