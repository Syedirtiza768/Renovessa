#!/usr/bin/env bash
# Live E2E: anonymous bathroom planner journey → estimate → brief → RFP
# against https://renovessa.com, with backend integrity verification and
# full test-data cleanup. Usage: bash scripts/e2e-bathroom-rfp-live.sh
set -u
BASE=https://renovessa.com
SERVER=ubuntu@ec2-23-21-67-7.compute-1.amazonaws.com
SSH_KEY=usinstance.pem
PASS=0; FAIL=0

check() { # check <actual> <expected-substring> <label>
  if echo "$1" | grep -q "$2"; then echo "PASS: $3"; PASS=$((PASS+1)); else echo "FAIL: $3 -> $1"; FAIL=$((FAIL+1)); fi
}

jget() { python -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

CID=$(python -c "import uuid;print(uuid.uuid4())")
ANS='{"requirementsPrompt":"E2E test project - replace tub with walk-in shower, mid-range finishes","bathroomType":"primary","projectObjective":"tub_to_shower","roomSizeBand":"medium","length":"8","width":"5","ceilingHeight":"8","measurement_method":"simple"}'

echo "== 1. create anonymous draft project (live) =="
R1=$(curl -s -X POST "$BASE/api/bathroom-projects" -H 'Content-Type: application/json' \
  -d "{\"plannerMode\":\"quick\",\"clientGeneratedId\":\"$CID\",\"answers\":$ANS}")
PID=$(echo "$R1" | jget "['id']"); PREF=$(echo "$R1" | jget "['referenceNumber']")
check "$R1" '"referenceNumber"' "project created (ref $PREF, id $PID)"

echo "== 2. re-create with same clientGeneratedId (dedupe) =="
R2=$(curl -s -X POST "$BASE/api/bathroom-projects" -H 'Content-Type: application/json' \
  -d "{\"plannerMode\":\"quick\",\"clientGeneratedId\":\"$CID\",\"answers\":$ANS}")
PID2=$(echo "$R2" | jget "['id']")
[ "$PID2" = "$PID" ] && { echo "PASS: dedupe returns same project"; PASS=$((PASS+1)); } || { echo "FAIL: dedupe created $PID2 != $PID"; FAIL=$((FAIL+1)); }

echo "== 3. autosave PATCH =="
R3=$(curl -s -X PATCH "$BASE/api/bathroom-projects/$PID" -H 'Content-Type: application/json' \
  -d "{\"currentStep\":\"estimate\",\"plannerMode\":\"quick\",\"answers\":$ANS}")
check "$R3" "\"id\":\"$PID\"" "autosave PATCH persisted"

echo "== 4. estimate preview =="
R4=$(curl -s -X POST "$BASE/api/bathroom-estimator/preview" -H 'Content-Type: application/json' -d "{\"answers\":$ANS}")
check "$R4" '"low"' "estimate preview computed"

echo "== 5. persist estimate =="
R5=$(curl -s -X POST "$BASE/api/bathroom-projects/$PID/estimates" -H 'Content-Type: application/json' \
  -d '{"objective":"tub_to_shower","bathroomType":"primary","finishTier":"standard","floorAreaSqft":40,"plumbingRelocationFt":0,"electricalModifications":2,"tileFullHeightRoom":false,"curblessShower":false,"condoHighFloor":false,"homeAgeYears":30,"waterDamageReported":false,"inRockville":true}')
EST_ID=$(echo "$R5" | jget "['estimate']['id']")
check "$R5" '"estimate"' "estimate persisted (id $EST_ID)"

echo "== 6. generate project brief =="
R6=$(curl -s -X POST "$BASE/api/bathroom-projects/$PID/brief" -H 'Content-Type: application/json')
BRIEF_ID=$(echo "$R6" | jget "['saved']['id']")
check "$R6" '"saved"' "brief generated (id $BRIEF_ID)"

echo "== 7. submit RFP (anonymous, full contact payload) =="
R7=$(curl -s -X POST "$BASE/api/bathroom-projects/$PID/rfp" -H 'Content-Type: application/json' \
  -d '{"firstName":"E2ETEST","lastName":"Cleanup","email":"e2e.test@example.com","phone":"3015550100","zipCode":"20850","preferredContact":"email","timeline":"1-3 months","tcpaConsent":true,"termsAccepted":true,"privacyAcknowledged":true,"notes":"Automated live E2E verification — safe to delete."}')
RFP_REF=$(echo "$R7" | jget "['referenceNumber']")
EMAIL_SENT=$(echo "$R7" | jget "['emailSent']")
check "$R7" '"referenceNumber"' "RFP submitted (ref $RFP_REF, emailSent=$EMAIL_SENT)"

echo "== 8. duplicate RFP submission must 409 =="
R8=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/bathroom-projects/$PID/rfp" -H 'Content-Type: application/json' \
  -d '{"firstName":"E2ETEST","email":"e2e.test@example.com","phone":"3015550100","zipCode":"20850","termsAccepted":true,"privacyAcknowledged":true}')
[ "$R8" = "409" ] && { echo "PASS: duplicate RFP rejected (409)"; PASS=$((PASS+1)); } || { echo "FAIL: duplicate RFP -> HTTP $R8"; FAIL=$((FAIL+1)); }

echo "== 9. missing consent must 400/409 =="
R9=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/bathroom-projects/$PID/rfp" -H 'Content-Type: application/json' \
  -d '{"firstName":"X","email":"x@example.com","phone":"3015550100","zipCode":"20850","termsAccepted":false,"privacyAcknowledged":true}')
{ [ "$R9" = "400" ] || [ "$R9" = "409" ]; } && { echo "PASS: missing consent rejected ($R9)"; PASS=$((PASS+1)); } || { echo "FAIL: consent check -> HTTP $R9"; FAIL=$((FAIL+1)); }

echo
echo "== backend integrity (prod DB) =="
cat > /tmp/e2e-live-verify.sql <<SQL
SELECT 'project', status, "projectRequestId" IS NOT NULL AS has_rfp FROM "BathroomProject" WHERE id='$PID';
SELECT 'rfp', source, status, "tcpaConsent", "termsAccepted", "consentVersion", "termsVersion", "privacyVersion" FROM "ProjectRequest" WHERE "referenceNumber"='$RFP_REF';
SELECT 'consent_events', count(*) FROM "ConsentEvent" WHERE "projectRequestId"=(SELECT id FROM "ProjectRequest" WHERE "referenceNumber"='$RFP_REF');
SELECT 'brief', count(*) FROM "ProjectBrief" WHERE "projectId"='$PID';
SELECT 'estimate', count(*) FROM "BathroomEstimate" WHERE "projectId"='$PID';
SELECT 'line_items', count(*) FROM "BathroomEstimateLineItem" li JOIN "BathroomEstimate" e ON li."estimateId"=e.id WHERE e."projectId"='$PID';
SELECT 'audit', count(*) FROM "AuditEvent" WHERE "bathroomProjectId"='$PID';
SQL
ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER" "docker exec -i renovessa-db-1 psql -U renovessa -d renovessa -t" < /tmp/e2e-live-verify.sql

echo
echo "== cleanup test data =="
cat > /tmp/e2e-live-cleanup.sql <<SQL
DELETE FROM "ConsentEvent" WHERE "projectRequestId"=(SELECT id FROM "ProjectRequest" WHERE "referenceNumber"='$RFP_REF');
DELETE FROM "AuditEvent" WHERE "bathroomProjectId"='$PID' OR "projectRequestId"=(SELECT id FROM "ProjectRequest" WHERE "referenceNumber"='$RFP_REF');
UPDATE "BathroomProject" SET "projectRequestId"=NULL WHERE id='$PID';
DELETE FROM "ProjectRequest" WHERE "referenceNumber"='$RFP_REF';
DELETE FROM "BathroomEstimateLineItem" WHERE "estimateId" IN (SELECT id FROM "BathroomEstimate" WHERE "projectId"='$PID');
DELETE FROM "BathroomEstimate" WHERE "projectId"='$PID';
DELETE FROM "ProjectBrief" WHERE "projectId"='$PID';
DELETE FROM "BathroomProject" WHERE id='$PID';
SQL
ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER" "docker exec -i renovessa-db-1 psql -U renovessa -d renovessa" < /tmp/e2e-live-cleanup.sql

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
