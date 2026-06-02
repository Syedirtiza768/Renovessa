#!/bin/sh
set -e

echo "Waiting for database..."
sleep 8

node node_modules/prisma/build/index.js db push

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts || echo "Seed skipped"
fi

exec node server.js
