# Production image for AWS App Runner, ECS Fargate or any container host.
#
#   docker build -t lms \
#     --build-arg NEXT_PUBLIC_APP_URL=https://<domain> \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg DEPLOYMENT_ID=$(git rev-parse --short HEAD) .
#   docker run -p 3000:3000 --env-file .env.production lms
#
# NEXT_PUBLIC_* values are compiled into the browser bundle, so they are build
# arguments. Every other setting (DATABASE_URL, JWT_SECRET, payment keys...) is
# read at runtime: pass them to the container, never bake them into the image.
# See docs/deploy-aws.md.

FROM node:22-bookworm-slim AS base
# Prisma's query engine needs OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall runs `prisma generate`, which only reads the schema
RUN npm ci

# ── Build ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0
ARG NEXT_PUBLIC_APP_ENV=production
ARG DEPLOYMENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE \
    NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    DEPLOYMENT_ID=$DEPLOYMENT_ID \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1

# src/lib/prisma.ts needs a DATABASE_URL to load, but no page queries the
# database during the build, so a placeholder is enough. The real one is given
# to the running container.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:1/build" npm run build

# ── Runtime ──
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# server.js finishes in-flight requests and pending after() callbacks on
# SIGTERM; give the platform's stop timeout at least 30 seconds.
CMD ["node", "server.js"]
