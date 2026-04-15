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

# Global prisma CLI for schema sync at boot (no npx TTY prompt)
RUN npm i -g prisma@6

# Work from the app dir so Node's module resolution walks up to
# /app/apps/api/node_modules (pnpm workspace) then /app/node_modules
WORKDIR /app/apps/api

# Workspace node_modules — the .pnpm virtual store lives here
COPY --from=builder /app/node_modules /app/node_modules
# App-specific node_modules — symlinks into the store for deps listed in apps/api/package.json
COPY --from=builder /app/apps/api/node_modules /app/apps/api/node_modules
# Workspace package (required so @ninjabackup/database symlink resolves)
COPY --from=builder /app/packages/database /app/packages/database
# Built API
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
# Prisma schema accessible at ./prisma
COPY --from=builder /app/packages/database/prisma ./prisma
# Workspace config for module resolution
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml

# Boot script — additive schema sync, then exec Node
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -u
echo "[boot] NinjaBackup API starting at $(date -u) on :${PORT:-3038}"
prisma db push --schema ./prisma/schema.prisma --skip-generate --accept-data-loss 2>&1 || echo "[boot] prisma db push failed — continuing"
exec node dist/main
EOF
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3038

EXPOSE 3038

CMD ["/app/start.sh"]
