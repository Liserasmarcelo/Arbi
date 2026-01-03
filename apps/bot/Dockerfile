# =====================================================
# PolyArbitrage Bot - Dockerfile
# =====================================================

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/polymarket-client/package.json ./packages/polymarket-client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build
RUN pnpm build:bot

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built files
COPY --from=builder --chown=nodejs:nodejs /app/apps/bot/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/bot/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/bot/package.json ./

USER nodejs

CMD ["node", "dist/index.js"]
