#!/bin/sh
set -eu

mkdir -p /home/bun/.bun/install/cache /usr/src/app/.next /usr/src/app/node_modules
chown -R bun:bun \
  /home/bun/.bun \
  /usr/src/app/.next \
  /usr/src/app/node_modules \
  /usr/src/app/src/generated/prisma

exec su -m bun -s /bin/sh -c \
  "cd /usr/src/app && bun install --frozen-lockfile && bun run dev"
