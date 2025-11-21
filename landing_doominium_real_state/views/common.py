from django.templatetags.static import static


def build_absolute_uri(request, path: str | None = None) -> str:
    if not path:
        return request.build_absolute_uri()
    if path.startswith(("http://", "https://")):
        return path
    return request.build_absolute_uri(path)


def organization_schema(request) -> dict:
    logo_url = build_absolute_uri(
        request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg")
    )
    return {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "DOMINIUM Realty",
        "url": build_absolute_uri(request, "/"),
        "logo": logo_url,
        "image": logo_url,
        "telephone": "+380730032121",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "UA",
            "addressLocality": "Київ",
            "streetAddress": "DOMINIUM Realty",
        },
        "sameAs": [
            "https://t.me/dominium_realty_agency",
            "https://www.facebook.com/DOMINIUM.REALTY.AGENCY",
        ],
    }


def get_client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")
