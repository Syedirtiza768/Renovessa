#!/bin/bash
set -euo pipefail
cd /opt/renovessa

echo "=== git pull ==="
git fetch origin
git reset --hard origin/main
git log -1 --oneline

echo "=== bathroom feature flags in .env ==="
ensure_flag() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}
ensure_flag BATHROOM_DEMO_MODE false
ensure_flag BATHROOM_ROCKVILLE_LANDING_ENABLED true
ensure_flag BATHROOM_PLANNER_ENABLED true
ensure_flag BATHROOM_DIAGRAM_BUILDER_ENABLED true
ensure_flag BATHROOM_AI_INTERPRETATION_ENABLED false
ensure_flag BATHROOM_ESTIMATOR_ENABLED true
ensure_flag BATHROOM_PERMIT_NAVIGATOR_ENABLED true
ensure_flag BATHROOM_PROJECT_BRIEF_ENABLED true
ensure_flag BATHROOM_CONTRACTOR_MATCHING_ENABLED false
ensure_flag BATHROOM_PROPOSAL_COMPARISON_ENABLED false
ensure_flag BATHROOM_CONTRACTOR_STUDIO_ENABLED true
grep '^BATHROOM_' .env || true

echo "=== docker rebuild ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "=== waiting for health ==="
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:7090/api/health >/dev/null 2>&1; then
    echo "healthy after ${i} checks"
    break
  fi
  sleep 5
  if [ "$i" -eq 60 ]; then
    echo "health check timed out"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
    docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app --tail 100
    exit 1
  fi
done

echo "=== status ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo "--- local bathroom route ---"
curl -sI http://127.0.0.1:7090/bathroom-remodeling/rockville-md | head -8
echo "--- public bathroom route ---"
curl -sI https://renovessa.com/bathroom-remodeling/rockville-md | head -10 || true
echo "DONE"
