#!/bin/sh
set -e

echo "══════════════════════════════════════════"
echo "  NinjaBackup API — Starting..."
echo "══════════════════════════════════════════"

# Run Prisma migrate on startup (safe for production — idempotent)
echo "[1/2] Running database migrations..."
prisma db push --schema ./prisma/schema.prisma --accept-data-loss 2>/dev/null || {
  echo "[!] db push failed, trying migrate deploy..."
  prisma migrate deploy --schema ./prisma/schema.prisma 2>/dev/null || echo "[!] No migrations to run"
}
echo "[✓] Database ready"

# Start the application
echo "[2/2] Starting NinjaBackup API on port ${PORT:-3038}..."
echo "══════════════════════════════════════════"
exec node dist/main
