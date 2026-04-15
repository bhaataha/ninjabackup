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
# Verify build
RUN ls -la apps/api/dist/main.js

# ── Stage 4: Production-only deps ──
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod
# Generate Prisma client in prod deps too
COPY packages/database/ ./packages/database/
RUN cd packages/database && npx prisma@6 generate

# ── Stage 5: Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

# Production node_modules (no devDeps, smaller image)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules

# Built API code
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# Prisma schema (for future migrations)
COPY --from=builder /app/packages/database/prisma ./prisma

# Verify @prisma/client loads
RUN node -e "const { PrismaClient } = require('@prisma/client'); console.log('✅ PrismaClient OK')"

ENV NODE_ENV=production
ENV PORT=3038
EXPOSE 3038

CMD ["node", "dist/main"]
