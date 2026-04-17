#!/usr/bin/env sh
set -eu

bun run prisma:deploy

exec "$@"
