# Build stage
# Use the repo-pinned Bun release for consistent local/CI/runtime behavior.
FROM oven/bun:1.3.13 AS base
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

ENV NODE_ENV=production

RUN export DATABASE_URL="postgresql://user:password@localhost:5432/dummy" \
 && export JWT_SECRET="docker-build-secret-0123456789abcdef0123456789abcdef" \
 && export AUTH_SECRET="docker-build-secret-0123456789abcdef0123456789abcdef" \
 && bun run build \
 && bun run build:tools

# Collect all runtime files into a single staging directory
RUN mkdir -p /output/.next /output/dist \
 && cp -a .next/standalone/. /output/ \
 && cp -a .next/static /output/.next/static \
 && cp -a public/. /output/public \
 && cp package.json /output/package.json \
 && cp prisma.config.ts /output/prisma.config.ts \
 && cp -a dist/tools /output/dist/tools \
 && cp -a prisma /output/prisma

# Final runtime image using Next.js standalone output
FROM base AS release
WORKDIR /usr/src/app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /usr/src/app/.cache \
 && chown -R bun:bun /usr/src/app/.cache \
 && chmod +x /usr/local/bin/docker-entrypoint.sh

# Use non-root user provided by Bun image
USER bun

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Copy all build output in one layer, then overlay full node_modules
COPY --chown=bun:bun --from=builder /output ./
COPY --chown=bun:bun --from=install /temp/dev/node_modules node_modules

# Expose default Next.js port
EXPOSE 3000/tcp

# Health check (optional, lightweight)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD bun run health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
# Run the Next.js standalone server with Bun directly.
CMD ["bun", "server.js"]
