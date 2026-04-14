#!/bin/sh
set -e

echo "NinjaBackup API starting..."

# Try db push, if it fails just continue
prisma db push --schema ./prisma/schema.prisma --skip-generate 2>&1 || true

echo "Starting server on port ${PORT:-3038}..."
exec node dist/main
