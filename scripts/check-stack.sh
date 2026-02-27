#!/usr/bin/env bash
# Проверка готовности стека после make up.
# Usage: ./scripts/check-stack.sh [API_URL] [WEB_URL]

API_URL="${1:-http://localhost:3000}"
WEB_URL="${2:-http://localhost:3001}"

ok=0

if curl -sf --max-time 5 "${API_URL}/ready" >/dev/null 2>&1; then
  echo "OK   backend  ${API_URL}"
  ok=1
else
  echo "FAIL backend  ${API_URL} (run: make up)"
fi

if curl -sf --max-time 5 -o /dev/null "${WEB_URL}" 2>/dev/null; then
  echo "OK   web      ${WEB_URL}"
  ok=$((ok + 1))
else
  echo "FAIL web      ${WEB_URL}"
fi

if [ "$ok" -eq 2 ]; then
  echo ""
  echo "Stack ready."
  exit 0
else
  echo ""
  echo "Some services are not ready."
  exit 1
fi
