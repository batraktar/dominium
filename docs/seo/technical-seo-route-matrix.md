# Technical SEO Route Matrix

Date: 2026-02-17

## Indexable routes
| Route | Robots | Canonical strategy | Structured data | Notes |
| --- | --- | --- | --- | --- |
| `/` | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` | self (host/scheme canonical-aware; tracking params dropped) | Organization + CollectionPage (legacy template flow) | Landing stays Django template. |
| `/search/` | index default; `noindex, follow` for filtered/paginated | strip `page/sort/per_page/currency` + tracking params (`utm_*`, `gclid`, `fbclid`, `msclkid`, `yclid`, `_ga`, `_gl`) | `WebSite + SearchAction`, `CollectionPage`, `BreadcrumbList` | SPA shell + React. |
| `/search/region/<slug>/` | same as `/search/` | same param stripping | same as `/search/` | API scope via `region_slug`. |
| `/search/city/<slug>/` | same as `/search/` | same param stripping | same as `/search/` | API scope via `city_slug`. |
| `/property/<slug>/` | index default | self | `RealEstateListing`, `BreadcrumbList`, `WebSite`, `Organization` | OG image from property main image if available. |

## Non-index routes
| Route | Robots | Why |
| --- | --- | --- |
| `/likes/` | `noindex, nofollow` | user-personal list |
| `/api/demo/` | `noindex, nofollow` | internal/testing screen |
| `/api/admin/` | `noindex, nofollow` | staff tool |
| `/test/map/interactive/` | `noindex, nofollow` | internal QA route |
| `/signup/` | `noindex, nofollow` | bridge/redirect route |
| `404` fallback pages | `noindex, nofollow` | unknown URL must not be indexed |

## Shared SEO requirements
1. `X-Robots-Tag` must mirror `<meta name="robots">`.
2. `canonical` must be absolute and host-correct.
3. Production must set `SEO_CANONICAL_HOST` + `SEO_CANONICAL_SCHEME=https` for stable canonical host.
4. Tracking query params must not pollute canonical URLs.
5. No canonical to `127.*` or local dev domains in production.
6. JSON-LD must render as valid escaped JSON in SSR head.
7. Sitemap must include only indexable route classes.
