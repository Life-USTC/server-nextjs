# Build stage
# Use official Bun image for faster install/runtime
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install all dependencies (dev) in a temp dir for caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Builder: bring dev node_modules and project files, then build
FROM base AS builder

COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build-time placeholders for build only.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"
ENV AUTH_SECRET="docker-build-placeholder-not-for-production"
ENV S3_ENDPOINT="http://localhost:9000"
ENV S3_BUCKET="dummy-bucket"
ENV S3_ACCESS_KEY_ID="dummy-access-key"
ENV S3_SECRET_ACCESS_KEY="dummy-secret-key"
ENV NODE_ENV=production

RUN bun run build
RUN bun run build:tools

# Final runtime image using Next.js standalone output
FROM base AS release
WORKDIR /usr/src/app

RUN apt-get update \
 && apt-get install -y git \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /usr/src/app/.cache \
 && chown -R bun:bun /usr/src/app

# Use non-root user provided by Bun image
USER bun

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Copy Next.js standalone output (includes server.js and minimal node_modules)
COPY --chown=bun:bun --from=builder /usr/src/app/.next/standalone ./
# Copy static assets (excluded from standalone, served separately or by CDN)
COPY --chown=bun:bun --from=builder /usr/src/app/.next/static .next/static
# Copy public assets
COPY --chown=bun:bun --from=builder /usr/src/app/public public
# Copy package.json for bun scripts (health check, cron tools)
COPY --chown=bun:bun --from=builder /usr/src/app/package.json package.json
# Copy tools and prisma for cron usage
COPY --chown=bun:bun --from=builder /usr/src/app/dist/tools dist/tools
COPY --chown=bun:bun --from=builder /usr/src/app/prisma prisma

# Expose default Next.js port
EXPOSE 3000/tcp

# Health check (optional, lightweight)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD bun run health || exit 1

# Use node server.js (node → bun symlink in oven/bun image)
CMD ["node", "server.js"]
