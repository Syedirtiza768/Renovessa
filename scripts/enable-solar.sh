#!/usr/bin/env bash
#
# Enable the Renovessa Solar planner on a deployed host.
#
# Validates every provider key against its live API BEFORE touching .env, so a
# bad or unrestricted key fails here rather than in front of a homeowner. Only
# if the required checks pass does it write the keys, flip the feature flags,
# recreate the container and smoke-test the result.
#
# Usage (run on the app host, from /opt/renovessa):
#
#   ./scripts/enable-solar.sh
#
# It prompts for each key with terminal echo disabled. Keys are never printed,
# never written to your shell history, and never leave the host.
#
# Re-runnable: existing keys are replaced, and .env is backed up each time.

set -euo pipefail
set +x  # never trace: this script handles secrets

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
SITE="${SITE:-https://renovessa.com}"

# A DMV coordinate used only to prove the APIs respond. Rockville, MD.
LAT=39.084
LON=-77.153

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

if [ ! -f "$ENV_FILE" ]; then
  red "No $ENV_FILE here. Run this from /opt/renovessa."
  exit 1
fi

bold "Renovessa Solar — enable planner"
echo
echo "Keys are read with echo off and are never printed or logged."
echo "Nothing is written until every required check passes."
echo

read -rsp "Google Maps Platform API key (Geocoding + Solar API): " GOOGLE_KEY; echo
read -rsp "NREL API key (used for PVWatts and OpenEI): " NREL_KEY; echo
echo

if [ -z "$GOOGLE_KEY" ] || [ -z "$NREL_KEY" ]; then
  red "Both keys are required. Nothing changed."
  exit 1
fi

# ---------------------------------------------------------------------------
# Validate. Each check reports a specific, actionable failure.
# ---------------------------------------------------------------------------
FAILED=0

bold "1/4  Google Geocoding API"
GEO_STATUS=$(curl -s --max-time 20 \
  "https://maps.googleapis.com/maps/api/geocode/json?address=Rockville,MD&key=${GOOGLE_KEY}" \
  | grep -oE '"status"[^,]*' | head -1 | grep -oE '[A-Z_]+$' || echo "NO_RESPONSE")

case "$GEO_STATUS" in
  OK) green "     OK" ;;
  REQUEST_DENIED)
    red "     REQUEST_DENIED — Geocoding API not enabled, or the key's IP restriction excludes this host."
    red "     This host's public IP: $(curl -s --max-time 10 https://api.ipify.org || echo 'unknown')"
    FAILED=1 ;;
  OVER_QUERY_LIMIT) red "     OVER_QUERY_LIMIT — billing not linked, or quota exhausted."; FAILED=1 ;;
  *) red "     Unexpected status: $GEO_STATUS"; FAILED=1 ;;
esac

bold "2/4  Google Solar API (Building Insights)"
SOLAR_BODY=$(curl -s --max-time 25 \
  "https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${LAT}&location.longitude=${LON}&requiredQuality=LOW&key=${GOOGLE_KEY}" || true)

if echo "$SOLAR_BODY" | grep -q '"solarPotential"'; then
  PANELS=$(echo "$SOLAR_BODY" | grep -oE '"maxArrayPanelsCount"[^,]*' | grep -oE '[0-9]+' | head -1 || echo "?")
  green "     OK — test property reports ${PANELS} candidate panel positions"
elif echo "$SOLAR_BODY" | grep -qi 'PERMISSION_DENIED\|API_KEY_SERVICE_BLOCKED\|has not been used'; then
  red "     PERMISSION_DENIED — Solar API is not enabled on this key's project,"
  red "     or the key is restricted to other APIs. Enable it at:"
  red "     https://console.cloud.google.com/apis/library/solar.googleapis.com"
  FAILED=1
elif echo "$SOLAR_BODY" | grep -qi 'billing'; then
  red "     Billing not enabled. The Solar API requires an active billing account."
  FAILED=1
elif echo "$SOLAR_BODY" | grep -q '"error"'; then
  red "     Error: $(echo "$SOLAR_BODY" | grep -oE '"message"[^,]*' | head -1)"
  FAILED=1
else
  red "     No usable response."
  FAILED=1
fi

bold "3/4  NREL PVWatts v8"
PV_BODY=$(curl -s --max-time 25 \
  "https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${NREL_KEY}&lat=${LAT}&lon=${LON}&system_capacity=8&azimuth=180&tilt=25&array_type=1&module_type=0&losses=14.08&timeframe=monthly" || true)

if echo "$PV_BODY" | grep -q '"ac_annual"'; then
  AC=$(echo "$PV_BODY" | grep -oE '"ac_annual":[0-9.]+' | grep -oE '[0-9.]+' | head -1)
  green "     OK — 8 kW south-facing test array models ${AC%.*} kWh/year here"
else
  red "     Failed. $(echo "$PV_BODY" | grep -oE '"errors":\[[^]]*\]' | head -1)"
  red "     Get a free key at https://developer.nrel.gov/signup/"
  FAILED=1
fi

# OpenEI shares the NREL key. Coverage is patchy by design, so a miss here is
# not fatal — the planner falls back to a homeowner-entered blended rate.
bold "4/4  OpenEI Utility Rate Database (optional)"
UR_BODY=$(curl -s --max-time 25 \
  "https://api.openei.org/utility_rates?version=latest&format=json&api_key=${NREL_KEY}&lat=${LAT}&lon=${LON}&sector=Residential&detail=full&limit=3" || true)

if echo "$UR_BODY" | grep -q '"items"'; then
  green "     OK"
else
  printf '\033[33m     No tariff match or key rejected — non-fatal, planner falls back to manual rate entry.\033[0m\n'
fi

echo
if [ "$FAILED" -ne 0 ]; then
  red "Required checks failed. $ENV_FILE was NOT modified and nothing was deployed."
  exit 1
fi
green "All required checks passed."
echo

# ---------------------------------------------------------------------------
# Write. Back up first; replace any existing values rather than appending dupes.
# ---------------------------------------------------------------------------
BACKUP="${ENV_FILE}.bak-$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BACKUP"
bold "Backed up $ENV_FILE -> $BACKUP"

set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # Use a non-/ delimiter: keys can contain slashes.
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

set_env GOOGLE_MAPS_API_KEY "$GOOGLE_KEY"
set_env NREL_API_KEY "$NREL_KEY"
set_env OPENEI_API_KEY "$NREL_KEY"
set_env SOLAR_LANDING_ENABLED true
set_env SOLAR_PLANNER_ENABLED true
set_env SOLAR_GEOSPATIAL_ENABLED true
set_env SOLAR_PVWATTS_ENABLED true
set_env SOLAR_UTILITY_RATES_ENABLED true
set_env SOLAR_PROJECT_BRIEF_ENABLED true

unset GOOGLE_KEY NREL_KEY

green "Keys written and flags enabled."
echo

# `up -d` (not `restart`): restart does not re-read .env into the container.
bold "Recreating the app container..."
"${COMPOSE[@]}" up -d app

printf 'Waiting for health'
for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" ps --format '{{.Service}} {{.Status}}' 2>/dev/null | grep -q '^app.*healthy'; then
    echo; green "Healthy."
    break
  fi
  printf '.'; sleep 3
done
echo

# ---------------------------------------------------------------------------
# Smoke test the live surface.
# ---------------------------------------------------------------------------
bold "Smoke test"
ALL_OK=1
for p in / /estimate /solar /solar/methodology /solar/planner; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${SITE}${p}")
  if [ "$code" = "200" ]; then
    green "  $code  $p"
  else
    red   "  $code  $p"
    ALL_OK=0
  fi
done

echo
if [ "$ALL_OK" -eq 1 ]; then
  green "Solar planner is live: ${SITE}/solar"
  echo
  echo "Next:"
  echo "  - ${SITE}/solar/methodology now reports the live providers as Active."
  echo "  - Cost ranges remain withheld until a reviewed pricing configuration is"
  echo "    published and NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION matches it."
  echo "  - Set a daily quota cap on the Solar API: /solar/planner is public and"
  echo "    Building Insights is billed per request."
else
  red "Some routes did not return 200. Roll back with:"
  red "  cp $BACKUP $ENV_FILE && ${COMPOSE[*]} up -d app"
  exit 1
fi
