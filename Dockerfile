# Build stage
# Use official Bun image for faster install/runtime
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies (dev) in a temp dir for caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production dependencies separately (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Pre-release: bring dev node_modules and project files
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Ensure Prisma Client is generated during build
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"
ENV S3_ENDPOINT="http://localhost:9000"
ENV S3_BUCKET="dummy-bucket"
ENV S3_ACCESS_KEY_ID="dummy-access-key"
ENV S3_SECRET_ACCESS_KEY="dummy-secret-key"
ENV NODE_ENV=production
ENV TSC_COMPILE_ON_ERROR=true
RUN bun run prebuild

# Build Next.js app
RUN bun run build

# Final runtime image with only production deps and build output
FROM base AS release
WORKDIR /usr/src/app

RUN apt update && apt install -y git && rm -rf /var/lib/apt/lists/*

# Use non-root user provided by Bun image
USER bun

# Copy production node_modules and minimal app files
COPY --chown=bun:bun --from=prerelease /usr/src/app/node_modules node_modules
COPY --chown=bun:bun --from=prerelease /usr/src/app/package.json package.json
COPY --chown=bun:bun --from=prerelease /usr/src/app/.next .next
COPY --chown=bun:bun --from=prerelease /usr/src/app/tools tools
COPY --chown=bun:bun --from=prerelease /usr/src/app/public public
COPY --chown=bun:bun --from=prerelease /usr/src/app/prisma prisma

# Expose default Next.js port
EXPOSE 3000/tcp

# Health check (optional, lightweight)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD bun run health || exit 1

# Start the Next.js app
ENTRYPOINT ["bun", "run", "start"]
