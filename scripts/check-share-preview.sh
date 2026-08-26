#!/usr/bin/env bash
# Optional post-deploy smoke: crawler UA against WEB_ORIGIN must get Share preview
# HTML (not the SPA shell). Not a substitute for unit tests in apps/web.
#
#   pnpm check:share-preview
#   WEB_ORIGIN=https://www.cinima.app SHARE_PATH=/realhandle/t/movie/550 pnpm check:share-preview
set -euo pipefail

WEB_ORIGIN="${WEB_ORIGIN:-https://www.cinima.app}"
SHARE_PATH="${SHARE_PATH:-/alice/t/movie/550}"
UA="${UA:-Twitterbot/1.0}"

url="${WEB_ORIGIN%/}${SHARE_PATH}"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT

curl -sS -A "$UA" -H "Accept: text/html" --max-time 20 -o "$body" "$url"

# SPA shell signals (bug): generic site OG + Vue mount
if grep -q 'id="app"' "$body" && grep -q 'property="og:title" content="Cinima"' "$body"; then
  echo "RED: crawler got SPA shell (generic Cinima OG), not Share preview"
  echo "url=$url ua=$UA"
  grep -E 'og:title|og:image|og:description|id="app"' "$body" | head -20
  exit 1
fi

# Share preview signals
if ! grep -q 'property="og:title"' "$body"; then
  echo "RED: no og:title"
  exit 1
fi
if grep -q 'property="og:title" content="Cinima"' "$body"; then
  echo "RED: og:title is still generic site title"
  exit 1
fi
if ! grep -q 'property="og:image"' "$body"; then
  echo "RED: missing og:image (Share preview needs a poster)"
  exit 1
fi

echo "GREEN: Share preview HTML for $url"
grep -E 'og:title|og:image|og:description' "$body" | head -10
exit 0
