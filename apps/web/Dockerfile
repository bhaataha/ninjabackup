# ═══════════════════════════════════════════════════════════
# NinjaBackup Dashboard — Production Dockerfile
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Dependencies (include devDeps for build) ──
FROM node:20-alpine AS deps
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
# Install ALL deps including dev (TypeScript types needed for build)
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Accept API URL as build argument (baked into the JS bundle)
ARG NEXT_PUBLIC_API_URL=https://api.backup.itninja.co.il/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# Keep NODE_ENV=production for optimized Next.js build output
ENV NODE_ENV=production

RUN cd apps/web && npx next build

# ── Stage 3: Runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public 2>/dev/null || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
