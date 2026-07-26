#!/bin/bash
set -euo pipefail
cd /opt/renovessa
for i in $(seq 1 36); do
  if curl -sf http://127.0.0.1:7090/api/health >/dev/null; then
    echo "HEALTHY_at_${i}"
    break
  fi
  echo "wait_${i}"
  sleep 5
  if [ "$i" -eq 36 ]; then
    echo TIMEOUT
    docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app --tail 80
    exit 1
  fi
done
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo "--- bathroom local ---"
curl -sI http://127.0.0.1:7090/bathroom-remodeling/rockville-md | head -8
echo "--- bathroom public ---"
curl -sI https://renovessa.com/bathroom-remodeling/rockville-md | head -10
echo "--- flags ---"
grep '^BATHROOM_' .env
git log -1 --oneline
