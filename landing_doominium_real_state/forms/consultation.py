from django import forms

from landing_doominium_real_state.forms.mixins import ContactInfoMixin


class ConsultationForm(ContactInfoMixin):
    name = forms.CharField(
        max_length=150,
        strip=True,
        error_messages={
            "required": "Імʼя обовʼязкове.",
            "max_length": "Імʼя надто довге.",
        },
    )
    message = forms.CharField(
        max_length=1000,
        strip=True,
        error_messages={
            "required": "Повідомлення обовʼязкове.",
            "max_length": "Повідомлення надто довге.",
        },
    )
    property = forms.CharField(
        required=False,
        max_length=500,
        strip=True,
    )
