from __future__ import annotations

import re
from typing import Any

DEFAULT_INDEX_ROBOTS = (
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
)

ZAKARPATTIA_CITIES = [
    "Берегове",
    "Виноградів",
    "Іршава",
    "Мукачево",
    "Перечин",
    "Рахів",
    "Свалява",
    "Тячів",
    "Ужгород",
    "Хуст",
    "Чоп",
]

LVIV_CITIES = [
    "Белз",
    "Бібрка",
    "Борислав",
    "Броди",
    "Буськ",
    "Великі Мости",
    "Глиняни",
    "Городок",
    "Добромиль",
    "Дрогобич",
    "Дубляни",
    "Жидачів",
    "Жовква",
    "Золочів",
    "Кам'янка-Бузька",
    "Львів",
    "Мостиська",
    "Перемишляни",
    "Пустомити",
    "Рава-Руська",
    "Радехів",
    "Рудки",
    "Самбір",
    "Сколе",
    "Сокаль",
    "Старий Самбір",
    "Стрий",
    "Трускавець",
    "Угнів",
    "Хирів",
    "Червоноград",
    "Яворів",
]

IVANO_FRANKIVSK_CITIES = [
    "Болехів",
    "Бурштин",
    "Галич",
    "Городенка",
    "Долина",
    "Івано-Франківськ",
    "Калуш",
    "Коломия",
    "Косів",
    "Надвірна",
    "Рогатин",
    "Снятин",
    "Тисмениця",
    "Тлумач",
    "Яремче",
]

CHERNIVTSI_CITIES = [
    "Вашківці",
    "Вижниця",
    "Герца",
    "Заставна",
    "Кіцмань",
    "Новодністровськ",
    "Новоселиця",
    "Сокиряни",
    "Сторожинець",
    "Хотин",
    "Чернівці",
]

TERNOPIL_CITIES = [
    "Бережани",
    "Борщів",
    "Бучач",
    "Заліщики",
    "Збараж",
    "Зборів",
    "Кременець",
    "Ланівці",
    "Монастириська",
    "Підволочиськ",
    "Підгайці",
    "Почаїв",
    "Скалат",
    "Тернопіль",
    "Теребовля",
    "Чортків",
    "Шумськ",
]

KYIV_CITIES = [
    "Київ",
    "Біла Церква",
    "Березань",
    "Богуслав",
    "Бориспіль",
    "Боярка",
    "Бровари",
    "Буча",
    "Васильків",
    "Вишневе",
    "Вишгород",
    "Ірпінь",
    "Кагарлик",
    "Миронівка",
    "Обухів",
    "Переяслав",
    "Ржищів",
    "Сквира",
    "Славутич",
    "Тараща",
    "Тетіїв",
    "Узин",
    "Українка",
    "Фастів",
    "Яготин",
]


def _keywords(*groups: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for group in groups:
        for item in group:
            value = (item or "").strip()
            if value and value not in seen:
                seen.add(value)
                result.append(value)
    return result


REGION_LANDING_CONFIG: dict[str, dict[str, Any]] = {
    "zakarpattia": {
        "title": "Нерухомість у Закарпатті та Карпатському регіоні",
        "name": "Закарпаття",
        "description": (
            "Продаж і оренда нерухомості в Закарпатті, а також у прилеглих західних областях "
            "для релокації, життя та інвестицій."
        ),
        "keywords": _keywords(
            ["Закарпаття", "Закарпатська область", "Закарпат"],
            ZAKARPATTIA_CITIES,
        ),
        "hero": (
            "Регіональний хаб для запитів по Закарпаттю, із покриттям сусідніх і близьких "
            "західних областей та міст."
        ),
        "include_regions": [
            "lviv",
            "ivano-frankivsk",
            "chernivtsi",
            "ternopil",
            "kyiv",
        ],
    },
    "lviv": {
        "title": "Нерухомість у Львові та західному кластері",
        "name": "Львів",
        "description": (
            "Каталог нерухомості у Львові, Львівській області та близьких регіонах заходу України."
        ),
        "keywords": _keywords(
            ["Львів", "Львівська область", "Львівщина"],
            LVIV_CITIES,
        ),
        "hero": (
            "Сторінка під високочастотні запити по Львову, із розширенням на сусідні "
            "регіони Карпатського поясу."
        ),
        "include_regions": ["zakarpattia", "ivano-frankivsk", "chernivtsi", "ternopil"],
    },
    "ivano-frankivsk": {
        "title": "Нерухомість в Івано-Франківській області",
        "name": "Івано-Франківськ",
        "description": (
            "Обʼєкти нерухомості в Івано-Франківську, Яремче, Буковелі та інших містах "
            "Прикарпаття."
        ),
        "keywords": _keywords(
            ["Івано-Франківськ", "Івано-Франківська область", "Прикарпаття"],
            IVANO_FRANKIVSK_CITIES,
        ),
        "hero": (
            "Лендінг для пошуку житла та інвестиційних обʼєктів у Прикарпатті."
        ),
        "include_regions": ["zakarpattia", "lviv", "chernivtsi", "ternopil"],
    },
    "chernivtsi": {
        "title": "Нерухомість у Чернівецькій області",
        "name": "Чернівці",
        "description": (
            "Продаж і оренда нерухомості в Чернівцях і Чернівецькій області з підбором "
            "по містах та районах."
        ),
        "keywords": _keywords(
            ["Чернівці", "Чернівецька область", "Буковина"],
            CHERNIVTSI_CITIES,
        ),
        "hero": (
            "Регіональна сторінка для Буковини, з фокусом на ліквідні міста та передгірні локації."
        ),
        "include_regions": ["ivano-frankivsk", "ternopil", "zakarpattia"],
    },
    "ternopil": {
        "title": "Нерухомість у Тернопільській області",
        "name": "Тернопіль",
        "description": (
            "Актуальні обʼєкти нерухомості у Тернополі та по всій Тернопільській області."
        ),
        "keywords": _keywords(
            ["Тернопіль", "Тернопільська область", "Тернопільщина"],
            TERNOPIL_CITIES,
        ),
        "hero": (
            "SEO-сторінка для попиту по Тернополю, Кременецькому та Чортківському напрямах."
        ),
        "include_regions": ["lviv", "ivano-frankivsk", "chernivtsi", "kyiv"],
    },
    "kyiv": {
        "title": "Нерухомість у Києві",
        "name": "Київ",
        "description": (
            "Квартири, будинки та комерційні обʼєкти у Києві та приміській зоні."
        ),
        "keywords": _keywords(
            ["Київ", "Київська область", "Київщина", "столиця"],
            KYIV_CITIES,
        ),
        "hero": (
            "Сторінка для столичного кластера з підсиленням запитів Київ + передмістя."
        ),
    },
}


def get_region_config(region_slug: str) -> dict[str, Any] | None:
    return REGION_LANDING_CONFIG.get((region_slug or "").strip().lower())


def collect_region_keywords(region_slug: str) -> list[str]:
    config = get_region_config(region_slug)
    if not config:
        return []

    keywords = _keywords(config.get("keywords", []))
    for include_slug in config.get("include_regions", []):
        include_cfg = get_region_config(include_slug)
        if include_cfg:
            keywords = _keywords(keywords, include_cfg.get("keywords", []))
    return keywords


def build_region_links() -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    for slug, cfg in REGION_LANDING_CONFIG.items():
        links.append({"slug": slug, "title": cfg["title"], "name": cfg["name"]})
    return links


REGION_CITIES: dict[str, list[str]] = {
    "zakarpattia": ZAKARPATTIA_CITIES,
    "lviv": LVIV_CITIES,
    "ivano-frankivsk": IVANO_FRANKIVSK_CITIES,
    "chernivtsi": CHERNIVTSI_CITIES,
    "ternopil": TERNOPIL_CITIES,
    "kyiv": KYIV_CITIES,
}

_UK_TO_LATIN = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "h",
    "ґ": "g",
    "д": "d",
    "е": "e",
    "є": "ie",
    "ж": "zh",
    "з": "z",
    "и": "y",
    "і": "i",
    "ї": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "kh",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "shch",
    "ь": "",
    "ю": "yu",
    "я": "ya",
    "ʼ": "",
    "'": "",
    "’": "",
    "`": "",
}


def _transliterate_uk_to_slug(value: str) -> str:
    normalized = "".join(_UK_TO_LATIN.get(ch, ch) for ch in (value or "").lower())
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized


def _build_city_landing_config() -> dict[str, dict[str, Any]]:
    data: dict[str, dict[str, Any]] = {}
    for region_slug, cities in REGION_CITIES.items():
        region_cfg = REGION_LANDING_CONFIG.get(region_slug, {})
        region_name = region_cfg.get("name", "")
        base_region_keywords = region_cfg.get("keywords", [])

        for city in cities:
            city_name = (city or "").strip()
            if not city_name:
                continue

            base_slug = _transliterate_uk_to_slug(city_name)
            if not base_slug:
                continue

            slug = base_slug
            if slug in data:
                slug = f"{base_slug}-{region_slug}"

            data[slug] = {
                "slug": slug,
                "city": city_name,
                "region_slug": region_slug,
                "title": f"Нерухомість у {city_name}",
                "name": city_name,
                "description": (
                    f"Купити або орендувати нерухомість у {city_name}. "
                    f"Актуальні обʼєкти DOMINIUM у місті та поруч у {region_name}."
                ),
                "hero": (
                    f"Каталог обʼєктів у {city_name} з розширенням на найближчі "
                    "міста та регіони."
                ),
                "keywords": _keywords(
                    [city_name, f"нерухомість {city_name}", f"квартири {city_name}"],
                    base_region_keywords,
                ),
            }
    return data


CITY_LANDING_CONFIG: dict[str, dict[str, Any]] = _build_city_landing_config()


def get_city_config(city_slug: str) -> dict[str, Any] | None:
    return CITY_LANDING_CONFIG.get((city_slug or "").strip().lower())


def collect_city_keywords(city_slug: str) -> list[str]:
    city_cfg = get_city_config(city_slug)
    if not city_cfg:
        return []

    keywords = _keywords(city_cfg.get("keywords", []), [city_cfg.get("city", "")])

    region_slug = city_cfg.get("region_slug", "")
    region_cfg = get_region_config(region_slug)
    if not region_cfg:
        return keywords

    keywords = _keywords(keywords, region_cfg.get("keywords", []))
    for include_slug in region_cfg.get("include_regions", []):
        include_cfg = get_region_config(include_slug)
        if include_cfg:
            keywords = _keywords(keywords, include_cfg.get("keywords", []))
    return keywords


def build_city_links(region_slug: str | None = None) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    active_region_slug = (region_slug or "").strip().lower()

    for slug, cfg in CITY_LANDING_CONFIG.items():
        if active_region_slug and cfg.get("region_slug") != active_region_slug:
            continue
        links.append(
            {
                "slug": slug,
                "title": cfg["title"],
                "name": cfg["name"],
                "region_slug": cfg["region_slug"],
            }
        )

    links.sort(key=lambda item: item["name"])
    return links
