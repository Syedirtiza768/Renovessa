#!/bin/sh
set -e

echo "Waiting for database..."
attempt=0
max_attempts=30
until npx prisma db push --skip-generate; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database schema push failed after ${max_attempts} attempts."
    exit 1
  fi
  echo "Database not ready (attempt ${attempt}/${max_attempts}), retrying in 3s..."
  sleep 3
done

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts || echo "Seed skipped"
fi

echo "Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-7090}..."
exec node server.js
