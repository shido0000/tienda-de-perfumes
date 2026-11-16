#!/usr/bin/env bash
# Smoke test del flujo de autenticación y reservas.
BASE="${BASE:-http://localhost:3000}"
JAR=/tmp/smoke-admin.txt
JAR2=/tmp/smoke-client.txt
rm -f "$JAR" "$JAR2"

echo "=== login admin ==="
curl -s -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nochedeautor.com","password":"Admin1234"}' | head -c 300
echo

echo "=== /api/auth/me (admin) ==="
curl -s -b "$JAR" "$BASE/api/auth/me" | head -c 300
echo

echo "=== /admin page with cookie ==="
curl -s -b "$JAR" -o /dev/null -w "%{http_code} redirect=%{redirect_url}\n" "$BASE/admin"

echo "=== /admin page without cookie ==="
curl -s -o /dev/null -w "%{http_code} redirect=%{redirect_url}\n" "$BASE/admin"

echo "=== /api/admin/reservations ==="
curl -s -b "$JAR" "$BASE/api/admin/reservations" | head -c 400
echo

echo "=== register + login client ==="
EMAIL="cliente$RANDOM@example.com"
curl -s -c "$JAR2" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Cliente Smoke\",\"email\":\"$EMAIL\",\"password\":\"secreto123\"}" | head -c 200
echo
curl -s -b "$JAR2" "$BASE/api/auth/me" | head -c 200
echo

echo "=== add to cart (client) ==="
PID=$(curl -s "$BASE/api/products" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.products[0].id)})")
echo "product=$PID"
curl -s -b "$JAR2" -X POST "$BASE/api/cart" -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PID\",\"quantity\":1}" | head -c 300
echo
curl -s -b "$JAR2" "$BASE/api/cart" | head -c 400
echo

echo "=== create reservation (pickup, base currency) ==="
curl -s -b "$JAR2" -X POST "$BASE/api/reservations" -H 'Content-Type: application/json' \
  -d '{"deliveryType":"PICKUP","paymentMethod":"CASH","notes":"Smoke test"}' | head -c 600
echo

echo "=== my reservations ==="
curl -s -b "$JAR2" "$BASE/api/reservations" | head -c 500
echo
