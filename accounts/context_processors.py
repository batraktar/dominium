from django.conf import settings


def liked_properties(request):
    liked_ids = []
    if request.user.is_authenticated:
        liked_ids = list(request.user.favorites.values_list("property_id", flat=True))
    return {"liked_ids": liked_ids}


def auth_modal_state(request):
    def pull(key):
        data = request.session.pop(key, None)
        return data if isinstance(data, dict) else {}

    # Ensure we clear legacy telegram modal data even though UI no longer uses it.
    pull("telegram_prefill")

    return {
        "auth_modals": {
            "register": pull("register_prefill"),
            "login": pull("login_prefill"),
        },
        "allow_manual_auth": getattr(settings, "ALLOW_MANUAL_AUTH", False),
    }
