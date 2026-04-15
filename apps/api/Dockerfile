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

# ── Stage 4: Bundle for production ──
# `pnpm --filter ... deploy` creates a self-contained directory at /app/bundle
# with prod deps only. `@prisma/client` ships its package, but the generated
# `.prisma/client` artifacts live next to whichever copy of @prisma/client
# pnpm hoisted — we regenerate from the schema in this stage to guarantee they
# end up alongside the bundle's @prisma/client.
FROM builder AS bundler
RUN pnpm --filter @ninjabackup/api deploy --prod /app/bundle
COPY packages/database/prisma /app/bundle/prisma
RUN cd /app/bundle && npx prisma@6 generate --schema=./prisma/schema.prisma

# ── Stage 5: Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

# Copy self-contained bundle (no symlinks, prisma client included)
COPY --from=bundler /app/bundle/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=bundler /app/bundle/package.json ./package.json
COPY --from=bundler /app/bundle/prisma ./prisma

# Verify runtime deps
RUN node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient(); console.log('PrismaClient OK')"

ENV NODE_ENV=production
ENV PORT=3038
EXPOSE 3038

CMD ["node", "dist/main"]
