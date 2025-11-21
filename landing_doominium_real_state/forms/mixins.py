import re

from django import forms

PHONE_PATTERN = re.compile(r"^\+?[0-9\s\-()]{9,20}$")


class PhoneValidationMixin(forms.Form):
    phone_error_messages = {
        "required": "Номер телефону обовʼязковий.",
        "max_length": "Номер телефону надто довгий.",
    }
    phone_max_length = 32

    phone = forms.CharField(
        max_length=phone_max_length,
        strip=True,
        error_messages=phone_error_messages,
    )

    def clean_phone(self):
        value = self.cleaned_data["phone"]
        compact = value.replace(" ", "")
        if not PHONE_PATTERN.match(value) or len(compact) < 9:
            raise forms.ValidationError("Введіть коректний номер телефону.")
        return value


class OptionalEmailMixin(forms.Form):
    email = forms.EmailField(
        required=False,
        error_messages={
            "invalid": "Некоректна електронна адреса.",
        },
    )

    def clean_email(self):
        value = self.cleaned_data.get("email")
        return value or ""


class ContactInfoMixin(PhoneValidationMixin, OptionalEmailMixin):
    """
    Базовий міксин із полями телефону та email.
    Наслідується від forms.Form, щоб Django зібрав оголошені поля.
    """

    pass
