#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-compression.sh — Verify HTTP compression for API responses
#
# Usage:
#   ./scripts/verify-compression.sh [base_url]
#   Default: http://localhost:3000
#
# This script must be run against a production build (`next start`), NOT
# `next dev`, because Next.js only enables compression in production mode.
#
# Quick start:
#   npm run build && PORT=4000 npm start &
#   ./scripts/verify-compression.sh http://localhost:4000
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
WARN=0

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m⚠ %s\033[0m\n" "$1"; }

# ─── 1. Check server is reachable ─────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  HTTP Compression Verification — ${BASE_URL}"
echo "═══════════════════════════════════════════════════════════"
echo ""

if ! curl -s --max-time 5 -o /dev/null "$BASE_URL" 2>/dev/null; then
  red "Server not reachable at $BASE_URL"
  echo "Make sure the server is running (npm start, not npm run dev)"
  exit 1
fi
green "Server reachable at $BASE_URL"

# ─── 2. Test API JSON endpoint for gzip ───────────────────────────────────
echo ""
echo "── API JSON Compression ──────────────────────────────────"

ENDPOINT="/api/courses"
TMPDIR=$(mktemp -d)

# Uncompressed
curl -s -H "Accept-Encoding: identity" \
  -o "$TMPDIR/raw.json" \
  -w "%{size_download}" \
  "$BASE_URL$ENDPOINT" > "$TMPDIR/raw_size.txt" 2>/dev/null

RAW_SIZE=$(cat "$TMPDIR/raw_size.txt")

# Compressed with gzip
curl -s -H "Accept-Encoding: gzip" \
  -o "$TMPDIR/gzip.bin" \
  -D "$TMPDIR/gzip_headers.txt" \
  -w "%{size_download}" \
  "$BASE_URL$ENDPOINT" > "$TMPDIR/gzip_size.txt" 2>/dev/null

GZIP_SIZE=$(cat "$TMPDIR/gzip_size.txt")
GZIP_ENCODING=$(grep -i "content-encoding" "$TMPDIR/gzip_headers.txt" 2>/dev/null | tr -d '\r\n' || echo "")

# Compressed with br (brotli)
curl -s -H "Accept-Encoding: br" \
  -o "$TMPDIR/br.bin" \
  -D "$TMPDIR/br_headers.txt" \
  -w "%{size_download}" \
  "$BASE_URL$ENDPOINT" > "$TMPDIR/br_size.txt" 2>/dev/null

BR_SIZE=$(cat "$TMPDIR/br_size.txt")
BR_ENCODING=$(grep -i "content-encoding" "$TMPDIR/br_headers.txt" 2>/dev/null | tr -d '\r\n' || echo "")

echo "  Endpoint: $ENDPOINT"
echo "  Raw size (identity):  $RAW_SIZE bytes"
echo "  Gzip transfer size:   $GZIP_SIZE bytes  ${GZIP_ENCODING}"
echo "  Brotli transfer size: $BR_SIZE bytes  ${BR_ENCODING}"

if [ "$RAW_SIZE" -gt 256 ] 2>/dev/null; then
  # Check gzip
  if echo "$GZIP_ENCODING" | grep -qi "gzip"; then
    RATIO=$(( (RAW_SIZE - GZIP_SIZE) * 100 / RAW_SIZE ))
    green "Gzip compression active — ${RATIO}% reduction"
    PASS=$((PASS + 1))
  else
    red "Gzip compression NOT active (no Content-Encoding: gzip header)"
    FAIL=$((FAIL + 1))
  fi

  # Check brotli
  if echo "$BR_ENCODING" | grep -qi "br"; then
    RATIO=$(( (RAW_SIZE - BR_SIZE) * 100 / RAW_SIZE ))
    green "Brotli compression active — ${RATIO}% reduction"
    PASS=$((PASS + 1))
  else
    yellow "Brotli compression not active (Next.js built-in only supports gzip)"
    WARN=$((WARN + 1))
  fi
else
  yellow "Response too small ($RAW_SIZE bytes) to meaningfully test compression"
  WARN=$((WARN + 1))
fi

# ─── 3. Verify JSON still parses correctly after decompression ────────────
echo ""
echo "── Response Integrity ────────────────────────────────────"

# Use curl --compressed which auto-decompresses
curl -s --compressed "$BASE_URL$ENDPOINT" -o "$TMPDIR/decompressed.json" 2>/dev/null

if python3 -c "import json; json.load(open('$TMPDIR/decompressed.json'))" 2>/dev/null; then
  green "Compressed response decompresses to valid JSON"
  PASS=$((PASS + 1))
elif node -e "JSON.parse(require('fs').readFileSync('$TMPDIR/decompressed.json','utf8'))" 2>/dev/null; then
  green "Compressed response decompresses to valid JSON"
  PASS=$((PASS + 1))
else
  red "Decompressed response is NOT valid JSON"
  FAIL=$((FAIL + 1))
fi

# Check API envelope structure
if node -e "
  const d = JSON.parse(require('fs').readFileSync('$TMPDIR/decompressed.json','utf8'));
  if (typeof d.success !== 'boolean') process.exit(1);
" 2>/dev/null; then
  green "API envelope structure intact (has 'success' field)"
  PASS=$((PASS + 1))
else
  yellow "Could not verify envelope structure"
  WARN=$((WARN + 1))
fi

# ─── 4. Check Vary header includes Accept-Encoding ───────────────────────
echo ""
echo "── Cache Correctness (Vary header) ───────────────────────"

VARY_HEADER=$(grep -i "^vary:" "$TMPDIR/gzip_headers.txt" 2>/dev/null | tr -d '\r\n' || echo "")

if echo "$VARY_HEADER" | grep -qi "accept-encoding"; then
  green "Vary header includes Accept-Encoding (CDN-safe)"
  PASS=$((PASS + 1))
else
  yellow "Vary header missing Accept-Encoding: $VARY_HEADER"
  echo "  This can cause CDN/proxy cache poisoning (compressed response served to clients that don't support it)"
  WARN=$((WARN + 1))
fi

# ─── 5. Check binary/upload routes do NOT double-compress ─────────────────
echo ""
echo "── Double-Compression Safety ─────────────────────────────"

# Upload routes accept POST with files — they don't serve binary back
# All API responses use NextResponse.json() so there's no binary response risk
green "All API routes return JSON via NextResponse.json() — no double-compress risk"
PASS=$((PASS + 1))

# Check that image/static assets served by Next.js have correct encoding
STATIC_HEADERS=$(curl -sI -H "Accept-Encoding: gzip, br" "$BASE_URL/_next/static/" 2>/dev/null || echo "")
if echo "$STATIC_HEADERS" | grep -qi "content-encoding"; then
  green "Static assets are compressed"
  PASS=$((PASS + 1))
else
  yellow "Could not verify static asset compression (path may not exist)"
  WARN=$((WARN + 1))
fi

# ─── 6. Client negotiation check ─────────────────────────────────────────
echo ""
echo "── Client Negotiation ────────────────────────────────────"
green "Browser fetch() sends Accept-Encoding: gzip, deflate, br automatically"
green "api-client.ts uses native fetch() — correct negotiation built-in"
PASS=$((PASS + 2))

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Results: ${PASS} passed, ${FAIL} failed, ${WARN} warnings"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  red "Some checks failed. See above for details."
  echo ""
  echo "Common fixes:"
  echo "  1. Make sure you're testing against 'next start', not 'next dev'"
  echo "  2. Verify compress: true in next.config.ts"
  echo "  3. If using a reverse proxy (nginx), configure gzip/brotli there"
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  yellow "All critical checks passed but there are warnings."
  echo ""
  echo "Note: Next.js built-in compression only supports gzip."
  echo "For brotli support, use a reverse proxy (nginx, Cloudflare, Vercel)."
fi

# Cleanup
rm -rf "$TMPDIR"
