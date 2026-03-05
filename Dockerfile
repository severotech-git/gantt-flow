# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────
# Stage 1: builder – compile the Next.js app
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# next build reads env vars at build time only for static generation;
# runtime secrets are injected via the container, not baked in.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ──────────────────────────────────────────────
# Stage 2: runner – minimal production image
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
