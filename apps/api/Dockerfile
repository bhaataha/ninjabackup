# ═══════════════════════════════════════════════════════════
# NinjaBackup API — Production Dockerfile
# ═══════════════════════════════════════════════════════════

FROM node:20-alpine AS base
RUN corepack enable pnpm

# ── Stage 1: Dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
RUN pnpm install --frozen-lockfile

# ── Stage 2: Prisma Generate ──
FROM deps AS prisma
COPY packages/database/ ./packages/database/
RUN cd packages/database && npx prisma generate

# ── Stage 3: Build ──
FROM prisma AS builder
COPY apps/api/ ./apps/api/
RUN cd apps/api && npx nest build

# ── Stage 4: Production Runner ──
FROM node:20-alpine AS runner
RUN corepack enable pnpm

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages/database/prisma ./prisma

# Prisma client
COPY --from=prisma /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=prisma /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma

# Entrypoint script — runs migrations then starts the app
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3038

EXPOSE 3038

ENTRYPOINT ["./entrypoint.sh"]
