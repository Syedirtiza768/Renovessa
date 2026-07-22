#!/usr/bin/env bash
set -euo pipefail
cd /opt/renovessa

get_env() {
  local key="$1"
  local line val
  line=$(grep -E "^${key}=" .env | head -1 || true)
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  val="${line#*=}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  printf '%s' "$val"
}

USER_NAME="$(get_env POSTGRES_USER)"
USER_NAME="${USER_NAME:-renovessa}"
PASS="$(get_env POSTGRES_PASSWORD)"
DB_NAME="$(get_env POSTGRES_DB)"
DB_NAME="${DB_NAME:-renovessa}"

if [[ -z "$PASS" ]]; then
  echo "Missing POSTGRES_PASSWORD"
  exit 1
fi

ENC_PASS=$(PASS="$PASS" python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["PASS"], safe=""))')
NET=$(docker inspect renovessa-db-1 --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
echo "Network=$NET"
echo "Import via docker node -> db:5432/${DB_NAME}"

docker run --rm \
  --network "$NET" \
  -v /opt/renovessa:/work \
  -w /work \
  -e DATABASE_URL="postgresql://${USER_NAME}:${ENC_PASS}@db:5432/${DB_NAME}?schema=public" \
  node:22-bookworm-slim \
  bash -lc 'npm install --no-save @prisma/client tsx prisma && npx prisma generate && npx tsx scripts/import_contacts_from_csv.ts data/contractor_enrichment/contacts_import.csv'
