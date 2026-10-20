#!/usr/bin/env bash
# Boot the backend under gunicorn the way production does and check that the
# analysis worker runs in the process that serves requests.
#
# Usage (from backend/): check_gunicorn_boot.sh <plain|preload>
# Expects SECRET_KEY, DATABASE_URL (migrated), ADMIN_PASSWORD_HASH and PORT.
set -euo pipefail

mode="$1"
base="http://127.0.0.1:${PORT}"
log="gunicorn-${mode}.log"

if [ "$mode" = preload ]; then
  # What a host can inject through the environment; the app must cope.
  export GUNICORN_CMD_ARGS="--preload --access-logfile -"
else
  unset GUNICORN_CMD_ARGS || true
fi
export ENABLE_EMBEDDED_WORKER=true

gunicorn app:app > "$log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf "$base/api/health" > /dev/null && break; sleep 1; done

fail() { echo "FAIL ($mode): $*"; echo '--- gunicorn log ---'; cat "$log"; exit 1; }

grep -q "Using worker: gthread" "$log" || fail "gthread worker not in use"

expected_preloaded=False
[ "$mode" = preload ] && expected_preloaded=True
grep -q "post_fork: .*app_preloaded=${expected_preloaded} embedded_worker_running=True" "$log" \
  || fail "post_fork did not start the worker in the serving process"

started=$(grep -c "Embedded analysis worker started" "$log" || true)
[ "$started" = 1 ] || fail "expected exactly 1 analysis worker, saw $started"

curl -s "$base/api/health" | python -c "import sys, json; sys.exit(0 if json.load(sys.stdin)['embeddedWorkerRunning'] else 1)" \
  || fail "/api/health says the analysis worker is not running in the serving process"

# A queued job must be picked up by that worker. The audio is junk, so it
# should end 'failed' with the unreadable-audio message -- quickly.
job=$(printf 'not audio' | curl -s -X POST "$base/api/analyze" -F topic=boot-check -F "audio=@-;filename=probe.mp3" \
  | python -c "import sys, json; print(json.load(sys.stdin)['job']['id'])")
status=pending
for _ in $(seq 1 30); do
  status=$(curl -s "$base/api/analyze/jobs/$job" | python -c "import sys, json; print(json.load(sys.stdin)['job']['status'])")
  [ "$status" = failed ] || [ "$status" = completed ] && break
  sleep 1
done
[ "$status" = failed ] || fail "queued job was not processed (status: $status)"

python ../.github/scripts/check_concurrency.py "$base"
echo "OK ($mode): worker in serving process, job processed, requests concurrent"
