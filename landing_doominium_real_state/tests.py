from django.test import SimpleTestCase

from landing_doominium_real_state.forms.consultation import ConsultationForm


class ConsultationFormTest(SimpleTestCase):
    def test_valid_form(self):
        form = ConsultationForm(
            data={
                "name": "Іван",
                "phone": "+380631112233",
                "email": "ivan@example.com",
                "message": "Хочу консультацію",
                "property": "https://example.com/property/1",
            }
        )
        self.assertTrue(form.is_valid(), form.errors)

    def test_invalid_phone(self):
        form = ConsultationForm(
            data={
                "name": "Іван",
                "phone": "123",
                "email": "ivan@example.com",
                "message": "Щось не так",
            }
        )
        self.assertFalse(form.is_valid())
        self.assertIn("Введіть коректний номер телефону.", form.errors["phone"])
