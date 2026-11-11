#!/bin/sh
# Loads supabase/schema.sql + storage.sql into a throwaway local Postgres and runs
# supabase/tests/security.test.sql. Needs the Postgres binaries (initdb, pg_ctl,
# psql) on PATH. Nothing touches the real Supabase project.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$(mktemp -d /tmp/blyppo-db.XXXXXX)
PORT=${PGTEST_PORT:-55439}
cleanup() { pg_ctl -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

initdb -D "$DIR/data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$DIR/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$DIR/log" -w start >/dev/null

run() { psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X "$@"; }
run -f "$ROOT/supabase/tests/stubs.sql"
run -f "$ROOT/supabase/schema.sql" >/dev/null 2>&1 || run -f "$ROOT/supabase/schema.sql"
run -f "$ROOT/supabase/storage.sql" >/dev/null 2>&1 || run -f "$ROOT/supabase/storage.sql"
run -f "$ROOT/supabase/tests/seed.sql"
run -f "$ROOT/supabase/tests/security.test.sql"
