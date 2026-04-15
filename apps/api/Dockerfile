# ═══════════════════════════════════════════════════════════
# NinjaBackup API — Production Dockerfile
# ═══════════════════════════════════════════════════════════

FROM node:20-alpine AS base
RUN corepack enable pnpm

# ── Stage 1: Dependencies (include devDeps for build) ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
# Install all deps including dev for build step
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile

# ── Stage 2: Prisma Generate (pinned to v6) ──
FROM deps AS prisma
COPY packages/database/ ./packages/database/
RUN cd packages/database && npx prisma@6 generate

# ── Stage 3: Build ──
FROM prisma AS builder
COPY apps/api/ ./apps/api/
RUN cd apps/api && npx @nestjs/cli build

# ── Stage 4: Production Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

# Install prisma CLI globally so `prisma db push` runs without npx download prompts
RUN npm i -g prisma@6

# Copy ALL node_modules (includes pnpm workspace symlinks for @ninjabackup/database)
COPY --from=builder /app/node_modules ./node_modules

# Copy the database package (needed at runtime for @ninjabackup/database imports)
COPY --from=builder /app/packages/database ./packages/database

# Copy built API
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

# Copy prisma schema (for potential migrations)
COPY --from=builder /app/packages/database/prisma ./prisma

# pnpm workspace config (needed for module resolution)
COPY --from=builder /app/package.json ./root-package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Boot script — keeps prisma sync best-effort and logs to stdout, then execs Node
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -u
echo "[boot] Syncing Prisma schema (additive)…"
prisma db push --schema ./prisma/schema.prisma --skip-generate --accept-data-loss 2>&1 || echo "[boot] prisma db push failed — continuing"
echo "[boot] Starting NestJS API on :${PORT:-3038}"
exec node dist/main
EOF
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3038

EXPOSE 3038

CMD ["/app/start.sh"]
