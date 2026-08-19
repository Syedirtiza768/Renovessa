#!/bin/bash
# Deploy SEO content system and publish articles on Renovessa server
# Run this script on the Ubuntu server at /opt/renovessa

set -euo pipefail

cd /opt/renovessa

echo "=== 1. Pull latest code ==="
git fetch origin
git reset --hard origin/agent/deploy-latest-2026-08-14
git log -1 --oneline

echo "=== 2. Rebuild Docker containers ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "=== 3. Wait for app health ==="
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:7090/api/health >/dev/null 2>&1; then
    echo "App healthy after ${i} checks"
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    echo "Health check timed out"
    exit 1
  fi
done

echo "=== 4. Seed content templates to database ==="
# Run seed script inside the app container
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app npx tsx scripts/seed-content-templates.ts

echo "=== 5. Verify seeded content ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U renovessa -d renovessa -c "SELECT slug, title, \"applicableTrade\", status FROM \"BathroomContentVersion\" ORDER BY \"applicableTrade\", slug;"

echo "=== 6. Publish HVAC guides (recommended first wedge) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U renovessa -d renovessa -c "
UPDATE \"BathroomContentVersion\" SET status = 'published', \"lastReviewedAt\" = NOW()
WHERE slug IN (
  'dmv/hvac-replacement-cost',
  'fairfax-va/ac-replacement-cost',
  'northern-virginia/heat-pump-replacement-cost',
  'dmv/hvac-repair-vs-replace',
  'fairfax-va/hvac-permits',
  'dmv/compare-hvac-quotes',
  'northern-virginia/ac-blowing-warm-air',
  'dmv/heat-pump-not-heating',
  'dmv/hvac-permits-comparison'
);
"

echo "=== 7. Verify published content ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U renovessa -d renovessa -c "SELECT slug, title, status FROM \"BathroomContentVersion\" WHERE status = 'published' ORDER BY \"applicableTrade\", slug;"

echo "=== 8. Smoke test public routes ==="
echo "--- /cost-guides ---"
curl -sI http://127.0.0.1:7090/cost-guides | head -3
echo "--- /resources ---"
curl -sI http://127.0.0.1:7090/resources | head -3
echo "--- Sample article: /cost-guides/dmv/hvac-replacement-cost ---"
curl -sI "http://127.0.0.1:7090/cost-guides/dmv/hvac-replacement-cost" | head -3
echo "--- Sitemap ---"
curl -sI http://127.0.0.1:7090/sitemap.xml | head -3

echo ""
echo "=== DONE ==="
echo "Published HVAC guides are now live at:"
echo "  https://renovessa.com/cost-guides/dmv/hvac-replacement-cost"
echo "  https://renovessa.com/resources/dmv/compare-hvac-quotes"
echo ""
echo "To publish more guides, run:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U renovessa -d renovessa -c \"UPDATE \\\"BathroomContentVersion\\\" SET status = 'published' WHERE slug = 'YOUR-SLUG';\""
