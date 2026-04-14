#!/bin/sh
set -e

echo "══════════════════════════════════════════"
echo "  NinjaBackup API — Starting..."
echo "══════════════════════════════════════════"

# Run Prisma migrate on startup (safe for production — idempotent)
echo "[1/2] Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma 2>/dev/null || {
  echo "[!] Migrate deploy not available, using db push..."
  npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss=false
}
echo "[✓] Database ready"

# Start the application
echo "[2/2] Starting NinjaBackup API on port ${PORT:-3038}..."
echo "══════════════════════════════════════════"
exec node dist/main
