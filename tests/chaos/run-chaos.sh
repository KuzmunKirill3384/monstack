#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_URL:-http://localhost:3000}"
COMPOSE="${COMPOSE_CMD:-docker compose}"
PASS=0
FAIL=0

ok()   { echo "  [PASS] $1"; ((PASS++)); }
fail() { echo "  [FAIL] $1"; ((FAIL++)); }

wait_ready() {
  local max=$1
  for i in $(seq 1 "$max"); do
    if curl -sf "$BASE_URL/ready" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

echo "=== Chaos Test: DB kill and recovery ==="
echo "  Killing postgres..."
$COMPOSE stop postgres
sleep 2

echo "  Checking backend responds 5xx or error..."
status=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/ready" 2>/dev/null || echo "000")
if [ "$status" != "200" ]; then
  ok "Backend returns non-200 when DB is down (got $status)"
else
  fail "Backend should not return 200 when DB is down"
fi

echo "  Restarting postgres..."
$COMPOSE start postgres
sleep 5

if wait_ready 30; then
  ok "Backend recovered after postgres restart"
else
  fail "Backend did not recover after postgres restart"
fi

echo ""
echo "=== Chaos Test: Backend kill and recovery ==="
echo "  Killing backend..."
$COMPOSE stop backend
sleep 2

echo "  Checking backend is unreachable..."
if ! curl -sf "$BASE_URL/ready" >/dev/null 2>&1; then
  ok "Backend is unreachable when stopped"
else
  fail "Backend should be unreachable when stopped"
fi

echo "  Restarting backend..."
$COMPOSE start backend
sleep 5

if wait_ready 30; then
  ok "Backend recovered after restart"
else
  fail "Backend did not recover after restart"
fi

echo ""
echo "=== Chaos Test: Large dataset query performance ==="
HOST_ID="${HOST_ID:-a0000000-0000-0000-0000-000000000001}"
TOKEN="${HOST_TOKEN:-local-dev-token}"

echo "  Inserting 1000 metric rows..."
for i in $(seq 1 100); do
  ts=$(date -u -d "$((i * 10)) seconds ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-"$((i * 10))"S +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "2025-06-01T12:00:00Z")
  curl -sf -X POST "$BASE_URL/v1/ingest" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"host_id\":\"$HOST_ID\",\"ts\":\"$ts\",\"metrics\":{\"cpu_total_pct\":$((RANDOM%100)),\"load1\":1,\"load5\":2,\"load15\":3,\"mem_used_mb\":1024,\"mem_total_mb\":8192,\"disk_used_pct\":50,\"net_rx_bps\":0,\"net_tx_bps\":0}}" \
    >/dev/null 2>&1 || true
done

echo "  Querying metrics (last 1h)..."
from=$(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "2025-06-01T11:00:00Z")
to=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "2025-06-01T12:00:00Z")

start_ms=$(($(date +%s%N 2>/dev/null || echo "0") / 1000000))
status=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/metrics?host=$HOST_ID&from=$from&to=$to&resolution=1m" 2>/dev/null || echo "000")
end_ms=$(($(date +%s%N 2>/dev/null || echo "0") / 1000000))
elapsed=$((end_ms - start_ms))

if [ "$status" = "200" ] && [ "$elapsed" -lt 2000 ]; then
  ok "Metrics query returned 200 in ${elapsed}ms (< 2000ms threshold)"
elif [ "$status" = "200" ]; then
  fail "Metrics query returned 200 but took ${elapsed}ms (> 2000ms threshold)"
else
  fail "Metrics query returned $status"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
