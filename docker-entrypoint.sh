#!/bin/sh
set -e

mkdir -p "${UPLOAD_DIR:-/app/uploads}/public" "${UPLOAD_DIR:-/app/uploads}/private"
node scripts/init-db.mjs
exec node server.js
