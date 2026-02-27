## Cursor Cloud specific instructions

This is a Next.js 16 app ("Life @ USTC") using **Bun** as the package manager and runtime, **PostgreSQL 16** as the database, and **Prisma** as the ORM. See `package.json` for all available scripts.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| PostgreSQL 16 | `sudo pg_ctlcluster 16 main start` | Must be running before the app starts. Database: `life_ustc`, user: `life_ustc`, password: `life_ustc` on `127.0.0.1:5432` |
| Next.js dev server | `bun run dev` | Runs on port 3000. Requires `.env` with `DATABASE_URL` and `AUTH_SECRET` |

### Key commands

- **Lint**: `bun run check` (Biome)
- **Unit tests**: `bun run test` (Vitest)
- **E2E tests**: `bun run test:e2e` (Playwright; install browsers first with `bun run test:e2e:install`)
- **Prisma generate**: `bun run prisma:generate`
- **Prisma migrate (non-interactive)**: `npx prisma migrate deploy`
- **Dev server**: `bun run dev`

### Non-obvious caveats

- **No `.env` is committed** — you must create one. Minimum required vars: `DATABASE_URL`, `AUTH_SECRET`. Set `E2E_MOCK_S3=1` to use in-memory mock S3 instead of real object storage.
- **`prisma migrate dev` is interactive** — it prompts for a migration name if the schema has drifted. Use `npx prisma migrate deploy` for non-interactive migration application.
- **Dev auth providers** — in `NODE_ENV=development`, two credential providers (`dev-debug` and `dev-admin`) are auto-enabled on the sign-in page at `/signin`. No external OAuth setup is required for local dev.
- **Pre-commit hook** — `.githooks/pre-commit` runs `bun run check --write`. Install with `bun run hooks:install`.
- The lockfile is `bun.lock` (not `bun.lockb`). Always use `bun install` to install dependencies.
