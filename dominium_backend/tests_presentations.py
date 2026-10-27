from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from house.models import Property


class PropertyPresentationTests(TestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username="presentation-staff",
            password="test-password",
            is_staff=True,
        )
        self.property = Property.objects.create(
            title="Будинок у Хусті",
            description='<p>Перший абзац.</p><p>Другий<br>рядок.</p>',
            address="Хуст",
            price=Decimal("85000"),
            area=120,
            rooms=4,
            slug="budynok-u-khusti",
        )

    def test_presentation_uses_clean_public_route_and_plain_description(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("property_presentation", kwargs={"slug": self.property.slug}))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Перший абзац.")
        self.assertContains(response, "Другий")
        self.assertNotContains(response, "&lt;p&gt;")
        self.assertContains(response, reverse("property_presentation_pdf", kwargs={"slug": self.property.slug}))
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")

    def test_presentation_download_is_a_real_pdf_attachment(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("property_presentation_pdf", kwargs={"slug": self.property.slug}))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_presentation_remains_staff_only(self):
        response = self.client.get(reverse("property_presentation", kwargs={"slug": self.property.slug}))
        self.assertEqual(response.status_code, 403)

    def test_legacy_admin_url_redirects_to_presentation(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("legacy_property_presentation", kwargs={"property_id": self.property.id}))
        self.assertRedirects(
            response,
            reverse("property_presentation", kwargs={"slug": self.property.slug}),
            fetch_redirect_response=False,
        )
