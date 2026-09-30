# ==============================================================================
# SpanQC / Wiring Diagram QC Assistant - Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Base & Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies deterministically
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate authoritative Prisma client
ENV PRISMA_CLI_QUERY_ENGINE_TYPE="binary"
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"
RUN npx prisma generate

# Build Next.js application in standalone mode
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Minimal Production Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user setup
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone runtime bundle
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy pdfjs-dist worker files into .next/server/chunks/ for headless PDF parsing
RUN mkdir -p .next/server/chunks node_modules/pdfjs-dist/legacy/build node_modules/pdfjs-dist/build
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs ./.next/server/chunks/pdf.worker.mjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs ./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdfjs-dist/build/pdf.worker.mjs ./node_modules/pdfjs-dist/build/pdf.worker.mjs

USER nextjs

EXPOSE 3000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Graceful Node.js entrypoint
CMD ["node", "server.js"]
