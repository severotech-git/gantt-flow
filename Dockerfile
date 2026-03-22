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

ARG NEXT_PUBLIC_GADS_CONVERSION_ID
ENV NEXT_PUBLIC_GADS_CONVERSION_ID=$NEXT_PUBLIC_GADS_CONVERSION_ID

RUN pnpm build

# Bundle the custom server (server.ts + local deps) into a single ESM file
# so we don't need tsx at runtime (avoids ERR_REQUIRE_CYCLE_MODULE on Node 22)
RUN pnpm exec esbuild server.ts --bundle --platform=node --format=esm \
    --outfile=server.mjs --packages=external --tsconfig=tsconfig.json \
 && pnpm exec esbuild next.config.ts --bundle --platform=node --format=esm \
    --outfile=next.config.mjs --packages=external

# Prune dev dependencies for a leaner production image
RUN pnpm prune --prod

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

# Copy production node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
# Copy the Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
# Copy the public folder
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public
# Copy package.json (needed by Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/package.json  ./package.json
# Copy pre-bundled server (no tsx needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/server.mjs    ./server.mjs
# Copy pre-compiled next.config (no TypeScript needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
# Copy i18n config (needed by next-intl plugin)
COPY --from=builder --chown=nextjs:nodejs /app/src/i18n       ./src/i18n
COPY --from=builder --chown=nextjs:nodejs /app/messages       ./messages

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Custom server: Next.js + Socket.IO on the same port
CMD ["node", "server.mjs"]
