#!/bin/bash
set -euo pipefail
cd /opt/renovessa
git fetch origin
git reset --hard origin/main
git log -1 --oneline
nohup docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build > /tmp/renovessa-deploy-diagram.log 2>&1 &
echo "PID:$!"
