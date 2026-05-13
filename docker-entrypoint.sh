#!/usr/bin/env sh
set -eu

bun run app:prepare:runtime

exec "$@"
