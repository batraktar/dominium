#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
REGION_PATH="${REGION_PATH:-/search/region/lviv/}"
CITY_PATH="${CITY_PATH:-/search/city/lviv/}"
PROPERTY_PATH="${PROPERTY_PATH:-}"
EXPECTED_CANONICAL_HOST="${EXPECTED_CANONICAL_HOST:-}"
EXPECTED_CANONICAL_SCHEME="${EXPECTED_CANONICAL_SCHEME:-https}"

PASS=0
FAIL=0

msg_ok() { echo "[OK] $1"; PASS=$((PASS + 1)); }
msg_fail() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }

fetch() {
  local path="$1"
  local out="$2"
  local code
  if ! code=$(curl -sS -o "$out" -D "$out.headers" -w "%{http_code}" "${BASE_URL}${path}"); then
    code="000"
    : > "$out"
    : > "$out.headers"
  fi
  echo "$code"
}

assert_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if grep -Fq "$needle" "$file"; then
    msg_ok "$label"
  else
    msg_fail "$label (missing: $needle)"
  fi
}

assert_not_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if grep -Fq "$needle" "$file"; then
    msg_fail "$label (unexpected: $needle)"
  else
    msg_ok "$label"
  fi
}

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

if ! curl -sS --max-time 5 -o /dev/null "${BASE_URL}/"; then
  echo "SEO smoke check: cannot reach ${BASE_URL}. Start Django server first."
  exit 2
fi

# 1) search base
search_html="$tmp_dir/search.html"
search_code=$(fetch "/search/" "$search_html")
[[ "$search_code" == "200" ]] && msg_ok "GET /search/ returns 200" || msg_fail "GET /search/ returns $search_code"
assert_contains "$search_html" 'id="root"' "Search renders SPA shell"
assert_contains "$search_html" 'name="robots"' "Search has robots meta"
assert_contains "$search_html.headers" 'X-Robots-Tag:' "Search has X-Robots-Tag header"
assert_contains "$search_html.headers" 'Content-Security-Policy-Report-Only:' "Search has CSP report-only header"
report_only_header="$(grep -i '^Content-Security-Policy-Report-Only:' "$search_html.headers" | head -n 1 | tr -d '\r')"
if [[ -n "$report_only_header" ]]; then
  if [[ "$report_only_header" == *"report-uri /_csp/report/"* ]]; then
    msg_ok "Search CSP report-only includes report-uri"
  else
    msg_fail "Search CSP report-only includes report-uri (missing in report-only header)"
  fi
  if [[ "$report_only_header" == *"script-src 'self' 'unsafe-inline'"* ]]; then
    msg_fail "Search CSP report-only removes script unsafe-inline (unexpected in report-only header)"
  else
    msg_ok "Search CSP report-only removes script unsafe-inline"
  fi
else
  msg_fail "Search CSP report-only includes report-uri (report-only header missing)"
  msg_fail "Search CSP report-only removes script unsafe-inline (report-only header missing)"
fi
assert_contains "$search_html.headers" 'Permissions-Policy:' "Search has Permissions-Policy header"
assert_contains "$search_html.headers" 'geolocation=()' "Search policy disables geolocation"
assert_contains "$search_html.headers" 'clipboard-write=(self)' "Search policy allows clipboard-write for share UX"
assert_contains "$search_html.headers" 'web-share=(self)' "Search policy allows web-share for share UX"
assert_contains "$search_html.headers" 'Cross-Origin-Resource-Policy: same-site' "Search has CORP header"
assert_contains "$search_html.headers" 'X-Permitted-Cross-Domain-Policies: none' "Search blocks cross-domain policies"
assert_contains "$search_html.headers" 'Origin-Agent-Cluster: ?1' "Search enables Origin-Agent-Cluster"
assert_contains "$search_html" '"SearchAction"' "Search has SearchAction schema"
assert_contains "$search_html" '"CollectionPage"' "Search has CollectionPage schema"
if [[ -n "$EXPECTED_CANONICAL_HOST" ]]; then
  assert_contains \
    "$search_html" \
    "rel=\"canonical\" href=\"${EXPECTED_CANONICAL_SCHEME}://${EXPECTED_CANONICAL_HOST}" \
    "Search canonical uses expected host"
fi

# 1b) canonical cleaning for tracking params (search)
search_tracking_html="$tmp_dir/search_tracking.html"
search_tracking_code=$(fetch "/search/?utm_source=qa&gclid=test-click" "$search_tracking_html")
[[ "$search_tracking_code" == "200" ]] && msg_ok "GET /search/?utm_source... returns 200" || msg_fail "GET /search/?utm_source... returns $search_tracking_code"
assert_contains "$search_tracking_html" 'rel="canonical" href="' "Search tracking route has canonical"
assert_not_contains "$search_tracking_html" 'utm_source=qa' "Search canonical/meta does not expose utm_source"
assert_not_contains "$search_tracking_html" 'gclid=test-click' "Search canonical/meta does not expose gclid"
assert_not_contains "$search_tracking_html" 'name="robots" content="noindex, follow"' "Search tracking-only query stays indexable"

# 2) search region/city scope
region_html="$tmp_dir/region.html"
region_code=$(fetch "$REGION_PATH" "$region_html")
[[ "$region_code" == "200" ]] && msg_ok "GET ${REGION_PATH} returns 200" || msg_fail "GET ${REGION_PATH} returns $region_code"
assert_contains "$region_html" 'id="root"' "Region route renders SPA shell"
assert_contains "$region_html" 'rel="canonical"' "Region route has canonical"
if [[ -n "$EXPECTED_CANONICAL_HOST" ]]; then
  assert_contains \
    "$region_html" \
    "rel=\"canonical\" href=\"${EXPECTED_CANONICAL_SCHEME}://${EXPECTED_CANONICAL_HOST}" \
    "Region canonical uses expected host"
fi

city_html="$tmp_dir/city.html"
city_code=$(fetch "$CITY_PATH" "$city_html")
[[ "$city_code" == "200" ]] && msg_ok "GET ${CITY_PATH} returns 200" || msg_fail "GET ${CITY_PATH} returns $city_code"
assert_contains "$city_html" 'id="root"' "City route renders SPA shell"
assert_contains "$city_html" 'rel="canonical"' "City route has canonical"
if [[ -n "$EXPECTED_CANONICAL_HOST" ]]; then
  assert_contains \
    "$city_html" \
    "rel=\"canonical\" href=\"${EXPECTED_CANONICAL_SCHEME}://${EXPECTED_CANONICAL_HOST}" \
    "City canonical uses expected host"
fi

# 2b) canonical cleaning for tracking params (home)
home_tracking_html="$tmp_dir/home_tracking.html"
home_tracking_code=$(fetch "/?utm_medium=email&fbclid=fb-click" "$home_tracking_html")
[[ "$home_tracking_code" == "200" ]] && msg_ok "GET /?utm_medium... returns 200" || msg_fail "GET /?utm_medium... returns $home_tracking_code"
assert_contains "$home_tracking_html" 'rel="canonical" href="' "Home tracking route has canonical"
assert_not_contains "$home_tracking_html" 'utm_medium=email' "Home canonical/meta does not expose utm_medium"
assert_not_contains "$home_tracking_html" 'fbclid=fb-click' "Home canonical/meta does not expose fbclid"
assert_contains "$home_tracking_html.headers" 'X-Robots-Tag: index, follow' "Home route has index X-Robots-Tag"
if [[ -n "$EXPECTED_CANONICAL_HOST" ]]; then
  assert_contains \
    "$home_tracking_html" \
    "rel=\"canonical\" href=\"${EXPECTED_CANONICAL_SCHEME}://${EXPECTED_CANONICAL_HOST}/\"" \
    "Home canonical uses expected host"
fi

# 3) non-index routes
for path in "/likes/" "/api/demo/" "/signup/?method=email"; do
  page="$tmp_dir/nonindex_$(echo "$path" | tr '/?=' '__').html"
  code=$(fetch "$path" "$page")
  [[ "$code" == "200" ]] && msg_ok "GET ${path} returns 200" || msg_fail "GET ${path} returns $code"
  assert_contains "$page" 'noindex, nofollow' "${path} has noindex meta"
  assert_contains "$page.headers" 'X-Robots-Tag: noindex, nofollow' "${path} has noindex header"
done

# 3b) 404 fallback must stay non-index
not_found_html="$tmp_dir/not_found.html"
not_found_code=$(fetch "/totally-missing-page/" "$not_found_html")
[[ "$not_found_code" == "404" ]] && msg_ok "GET /totally-missing-page/ returns 404" || msg_fail "GET /totally-missing-page/ returns $not_found_code"
assert_contains "$not_found_html" 'name="robots" content="noindex, nofollow"' "404 page has noindex meta"
assert_contains "$not_found_html.headers" 'X-Robots-Tag: noindex, nofollow' "404 page has noindex header"

# 4) optional property detail checks
if [[ -n "$PROPERTY_PATH" ]]; then
  property_html="$tmp_dir/property.html"
  property_code=$(fetch "$PROPERTY_PATH" "$property_html")
  [[ "$property_code" == "200" ]] && msg_ok "GET ${PROPERTY_PATH} returns 200" || msg_fail "GET ${PROPERTY_PATH} returns $property_code"
  assert_contains "$property_html" '"RealEstateListing"' "Property has RealEstateListing schema"
  assert_contains "$property_html" 'article:published_time' "Property has article:published_time"
  assert_contains "$property_html" 'property="og:image"' "Property has OG image"
fi

# 5) core SEO files
robots_txt="$tmp_dir/robots.txt"
robots_code=$(fetch "/robots.txt" "$robots_txt")
[[ "$robots_code" == "200" ]] && msg_ok "GET /robots.txt returns 200" || msg_fail "GET /robots.txt returns $robots_code"
assert_contains "$robots_txt" 'Sitemap:' "robots.txt contains sitemap links"
if [[ -n "$EXPECTED_CANONICAL_HOST" ]]; then
  assert_contains \
    "$robots_txt" \
    "${EXPECTED_CANONICAL_SCHEME}://${EXPECTED_CANONICAL_HOST}/sitemap.xml" \
    "robots.txt sitemap uses expected host"
fi

sitemap_xml="$tmp_dir/sitemap.xml"
sitemap_code=$(fetch "/sitemap.xml" "$sitemap_xml")
[[ "$sitemap_code" == "200" ]] && msg_ok "GET /sitemap.xml returns 200" || msg_fail "GET /sitemap.xml returns $sitemap_code"
assert_contains "$sitemap_xml" '<urlset' "sitemap.xml has urlset"

image_sitemap_xml="$tmp_dir/sitemap-images.xml"
image_sitemap_code=$(fetch "/sitemap-images.xml" "$image_sitemap_xml")
[[ "$image_sitemap_code" == "200" ]] && msg_ok "GET /sitemap-images.xml returns 200" || msg_fail "GET /sitemap-images.xml returns $image_sitemap_code"
assert_contains "$image_sitemap_xml" '<urlset' "sitemap-images.xml has urlset"

# 6) anti-localhost guard
assert_not_contains "$search_html" '127.0.0.1' "Search HTML has no 127.0.0.1 links"
assert_not_contains "$search_html" 'localhost:8000/property/' "Search HTML has no backend-host property links"

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "SEO smoke check passed: ${PASS} checks"
  exit 0
fi

echo "SEO smoke check failed: ${FAIL} failed / ${PASS} passed"
exit 1
