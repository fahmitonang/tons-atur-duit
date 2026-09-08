FROM node:22-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"

# Use local prisma binary directly — NEVER npx (which may download a different version)
RUN ./node_modules/.bin/prisma generate
RUN npm run build

# Stage 3: Production server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma engines and CLI for database migrations during startup
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Ensure nextjs user has permission to read schema and push db
RUN chown -R nextjs:nodejs /app/prisma /app/node_modules/.prisma /app/node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/auth/session || exit 1

# Use local prisma CLI directly (not .bin symlink which doesn't survive standalone copy)
CMD sh -c "node node_modules/prisma/build/index.js db push --accept-data-loss && node server.js"
