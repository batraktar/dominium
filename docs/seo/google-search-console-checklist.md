# Google Search Console Checklist (React SPA + Django SEO)

Date: 2026-02-17
Owner: DOMINIUM frontend/backend

## Goal
Випустити SPA-міграцію без SEO просідання: індексація, canonical, structured data, coverage.

## 1) Pre-launch checks (must-pass)
1. `robots.txt` доступний і повертає актуальний host + sitemap URLs.
2. `sitemap.xml` і `sitemap-images.xml` віддають `200` і валідний XML.
3. Indexable routes мають узгоджені `meta robots` і `X-Robots-Tag`.
4. Non-index routes (`/likes/`, `/api/demo/`, `/api/admin/`, `/signup/`, `/test/map/interactive/`) мають `noindex, nofollow`.
5. `canonical` не містить шумових параметрів (`page`, `sort`, `per_page`, `currency`).
6. Structured data валідний на key routes (CollectionPage / RealEstateListing / WebSite).
7. Для production задано `SEO_CANONICAL_HOST` + `SEO_CANONICAL_SCHEME=https`.

## 2) GSC setup
1. Додати property для production domain (Domain property, не URL-prefix).
2. Підтвердити володіння через DNS TXT.
3. Додати URL-prefix property для швидких перевірок (optional).
4. Вказати preferred canonical host (www/non-www) на рівні інфраструктури (redirect 301).

## 3) Submit sitemaps
1. Додати `https://<domain>/sitemap.xml`.
2. Додати `https://<domain>/sitemap-images.xml`.
3. Переконатися, що кількість discovered URLs не падає після релізу.

## 4) URL Inspection (manual sample)
Перевірити інспекцією щонайменше:
1. `/`
2. `/search/`
3. `/search/region/lviv/`
4. `/search/city/lviv/` (актуальний slug з sitemap)
5. `/property/<top-slug>/`

Очікування:
1. URL is on Google (для старих сторінок) або queued for indexing (для нових).
2. User-declared canonical = Google-selected canonical.
3. Crawled page має SSR meta/schema (не пустий head).

## 5) Post-launch monitoring window (14 days)
1. Coverage: тренд indexed pages не падає різко (>20%).
2. Pages with `Crawled - currently not indexed`: не зростають аномально.
3. Duplicate without user-selected canonical: відслідкувати й прибрати джерела дублю.
4. Core Web Vitals: no severe regressions на mobile.
5. Search appearance (Rich results): перевірити помилки schema.

## 6) Alert thresholds (recommended)
1. Indexed pages drop > 20% day-over-day -> incident.
2. Soft 404 spike > 2x baseline -> incident.
3. Server errors (5xx) in Crawl stats > 1% -> incident.
4. Redirect errors > baseline + 30% -> incident.

## 7) Rollback criteria
1. Масове зникнення індексації ключових `/property/*` URL.
2. Некоректний canonical (на інший хост/путь).
3. robots/noindex помилково на indexable routes.

## 8) Evidence to store
1. Screenshots URL inspection for 5 sample URLs.
2. Sitemap submission status screenshots.
3. Coverage chart snapshot before/after release (day 0, day 7, day 14).
