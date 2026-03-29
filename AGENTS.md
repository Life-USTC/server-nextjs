# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Life@USTC is a Next.js 16 course/schedule management app for USTC, using Bun as the runtime/package manager, PostgreSQL 16 as the database, and Prisma as the ORM.

### Services

| Service | How to start | Notes |
|---|---|---|
| PostgreSQL 16 | `sudo dockerd &>/dev/null &` then `sudo docker compose -f docker-compose.dev.yml up -d postgres` | Must be running before the app starts |
| Next.js dev server | `bun run dev` | Runs on port 3000 with Turbopack |

### Key commands

See `package.json` scripts for the full list. The most commonly used:

- **Lint**: `bun run check` (Biome)
- **Typecheck**: `bun run typecheck`
- **Unit tests**: `bun run test` (Vitest)
- **E2E tests**: `bun run test:e2e` (Playwright; install browsers first with `bun run test:e2e:install`)
- **Dev server**: `bun run dev`
- **Prisma migrations**: `bun run prisma:deploy` (apply), `bun run prisma:migrate` (dev)
- **Codegen**: `bun run prebuild` (Prisma client + OpenAPI types)

### Environment setup

- Copy `.env.example` to `.env` and fill in secrets. For local dev, set `E2E_MOCK_S3="1"` to skip S3/MinIO.
- Debug auth providers (`Sign in with Debug User (Dev)` / `Sign in with Admin User (Dev)`) are available in development mode — no external OAuth config needed.

### Non-obvious gotchas

- Docker-in-Docker in this Cloud Agent environment requires `fuse-overlayfs` storage driver and `iptables-legacy`. The daemon config is at `/etc/docker/daemon.json`.
- The `dockerd` process must be started manually with `sudo dockerd &>/dev/null &` before using `docker compose`.
- Two unit test files (`parse-date-input.test.ts`, `serialize-date-output.test.ts`) import from `bun:test` instead of `vitest` and fail when run via `vitest run`. This is a known pre-existing issue.
- Time-related test failures in `time-utils.test.ts` are caused by the VM timezone (UTC) differing from the expected Asia/Shanghai timezone in test assertions. These are pre-existing.
- After pulling new code with Prisma schema changes, run `bun run prisma:deploy && bun run prebuild` before starting the dev server.
- The `bun run prebuild` step includes `prisma:generate`, `openapi:generate`, and `openapi:types` — all three are needed for the app to compile.
