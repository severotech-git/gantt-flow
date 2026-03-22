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

# Copy production node_modules (includes socket.io, tsx, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
# Copy the Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
# Copy the public folder
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public
# Copy package.json (needed by Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/package.json  ./package.json
# Copy custom server and its dependencies
COPY --from=builder --chown=nextjs:nodejs /app/server.ts     ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/socketAuth.ts  ./src/lib/socketAuth.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/socketEvents.ts ./src/lib/socketEvents.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/socket.ts      ./src/lib/socket.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/mongodb.ts     ./src/lib/mongodb.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/models         ./src/lib/models
# Copy tsconfig for tsx path resolution
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
# Copy next.config for the Next.js app
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
# Copy i18n config (needed by next-intl plugin)
COPY --from=builder --chown=nextjs:nodejs /app/src/i18n       ./src/i18n
COPY --from=builder --chown=nextjs:nodejs /app/messages       ./messages

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Custom server: Next.js + Socket.IO on the same port
CMD ["node", "--import", "tsx/esm", "server.ts"]
