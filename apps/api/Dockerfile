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
RUN npm i -g prisma@6

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages/database/prisma ./prisma

# Prisma client
COPY --from=prisma /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=prisma /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
ENV PORT=3038

EXPOSE 3038

CMD ["node", "dist/main"]
