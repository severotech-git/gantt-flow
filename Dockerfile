# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────
# Stage 1: deps – install production dependencies
# ──────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ──────────────────────────────────────────────
# Stage 2: builder – compile the Next.js app
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy all deps (including devDeps needed for build)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# next build reads env vars at build time only for static generation;
# runtime secrets are injected via the container, not baked in.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ──────────────────────────────────────────────
# Stage 3: runner – minimal production image
# ──────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone output (includes a trimmed node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
# Copy the public folder
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next/standalone produces server.js at the root
CMD ["node", "server.js"]
