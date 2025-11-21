from django import forms

from .models import Feature, Property, PropertyImage


class PropertyForm(forms.ModelForm):
    features = forms.ModelMultipleChoiceField(
        queryset=Feature.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False,
    )

    class Meta:
        model = Property
        fields = [
            "title",
            "address",
            "property_type",
            "deal_type",
            "area",
            "rooms",
            "price",
            "features",
        ]


class PropertyImageForm(forms.ModelForm):
    class Meta:
        model = PropertyImage
        fields = ["image", "is_main"]
