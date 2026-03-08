#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
REGION_PATH="${REGION_PATH:-/search/region/lviv/}"
CITY_PATH="${CITY_PATH:-/search/city/lviv/}"
PROPERTY_PATH="${PROPERTY_PATH:-}"

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

assert_spa_shell_marker() {
  local file="$1"
  local label="$2"
  assert_contains "$file" 'name="dominium-runtime-shell" content="react-spa"' "$label has SPA marker"
  if grep -Fq 'id="root"' "$file" || grep -Fq 'React bundle недоступний' "$file"; then
    msg_ok "$label has root/fallback shell"
  else
    msg_fail "$label has root/fallback shell"
  fi
}

check_spa_route() {
  local path="$1"
  local label="$2"
  shift 2

  local page="$tmp_dir/$(echo "$label" | tr ' ' '_' | tr '/' '_').html"
  local code
  code=$(fetch "$path" "$page")
  [[ "$code" == "200" ]] && msg_ok "GET ${path} returns 200" || msg_fail "GET ${path} returns $code"
  assert_spa_shell_marker "$page" "$label"

  local legacy_marker
  for legacy_marker in "$@"; do
    assert_not_contains "$page" "$legacy_marker" "$label excludes legacy asset"
  done
}

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

if ! curl -sS --max-time 5 -o /dev/null "${BASE_URL}/"; then
  echo "Runtime switch smoke check: cannot reach ${BASE_URL}. Start Django server first."
  exit 2
fi

check_spa_route \
  "/search/" \
  "search" \
  "base/assets/js/search/api.js" \
  "base/assets/js/search/ui.js" \
  "base/assets/js/search/index.js"

check_spa_route \
  "/likes/" \
  "likes" \
  "base/assets/js/likes/index.js" \
  "base/assets/js/share.js"

check_spa_route \
  "/api/demo/" \
  "api_demo" \
  "base/assets/js/property_api_demo.js"

check_spa_route \
  "/test/map/interactive/" \
  "interactive_map_test" \
  "base/assets/js/interactive_map_test.js" \
  "base/assets/js/map_config.js"

check_spa_route \
  "/signup/?method=email" \
  "signup" \
  "base/assets/js/social_signup_bridge.js"

check_spa_route \
  "$REGION_PATH" \
  "search_region" \
  "base/assets/js/search/index.js"

check_spa_route \
  "$CITY_PATH" \
  "search_city" \
  "base/assets/js/search/index.js"

if [[ -n "$PROPERTY_PATH" ]]; then
  check_spa_route \
    "$PROPERTY_PATH" \
    "property_detail" \
    "base/assets/js/property_map.js" \
    "base/assets/js/property_detail_admin.js"
fi

# Non-staff /api/admin stays backend 404
admin_html="$tmp_dir/api_admin.html"
admin_code=$(fetch "/api/admin/" "$admin_html")
[[ "$admin_code" == "404" ]] && msg_ok "GET /api/admin/ (non-staff) returns 404" || msg_fail "GET /api/admin/ (non-staff) returns $admin_code"
assert_not_contains "$admin_html" 'name="dominium-runtime-shell" content="react-spa"' "/api/admin/ non-staff is not SPA shell"

# Landing route must remain legacy runtime source
home_html="$tmp_dir/home.html"
home_code=$(fetch "/" "$home_html")
[[ "$home_code" == "200" ]] && msg_ok "GET / returns 200" || msg_fail "GET / returns $home_code"
assert_not_contains "$home_html" 'name="dominium-runtime-shell" content="react-spa"' "Home route stays legacy runtime"

# Unknown route should stay backend 404 (non-SPA)
not_found_html="$tmp_dir/not_found.html"
not_found_code=$(fetch "/runtime-audit-missing-route/" "$not_found_html")
[[ "$not_found_code" == "404" ]] && msg_ok "GET missing route returns 404" || msg_fail "GET missing route returns $not_found_code"
assert_not_contains "$not_found_html" 'name="dominium-runtime-shell" content="react-spa"' "Missing route is backend 404 template"
assert_contains "$not_found_html.headers" 'X-Robots-Tag: noindex, nofollow' "Missing route has noindex X-Robots-Tag"

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "Runtime switch smoke check passed: ${PASS} checks"
  exit 0
fi

echo "Runtime switch smoke check failed: ${FAIL} failed / ${PASS} passed"
exit 1
