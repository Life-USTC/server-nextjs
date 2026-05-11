# tests/e2e/

Playwright browser tests.

## Commands

```bash
bun run test:e2e                    # All
bun run test:e2e -- path/to/test   # Focused
bun run test:e2e:headed             # Headed
bun run test:e2e:ui                 # Playwright UI
bun run check:e2e                   # Convention check
```

## Local Setup

1. **Start local infra** (once; data persists across restarts):
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
   This starts Postgres, MinIO, and `minio-setup` (which auto-creates bucket `life-ustc-dev`).
   Playwright global setup also provisions the dedicated E2E bucket `life-ustc-e2e`
   unless you override it with `PLAYWRIGHT_S3_BUCKET`.
   Console: <http://127.0.0.1:9001> (user/pass: `minioadmin`)

2. **Build the app**:
   ```bash
   bun run build && bun run test:e2e:prepare-server
   ```

3. **Start the standalone server** (keep running across test runs):
   ```bash
   HOSTNAME=127.0.0.1 PORT=3000 \
   APP_PUBLIC_ORIGIN=http://127.0.0.1:3000 \
   AUTH_TRUST_HOST=true E2E_DEBUG_AUTH=1 \
   AUTH_URL=http://127.0.0.1:3000 \
   BETTER_AUTH_URL=http://127.0.0.1:3000 \
   NEXTAUTH_URL=http://127.0.0.1:3000 \
   DEV_DEBUG_USERNAME=liuyang DEV_DEBUG_NAME=刘洋 \
   DEV_DEBUG_PASSWORD=e2e-debug-local-only \
   DEV_ADMIN_USERNAME=dev-admin DEV_ADMIN_NAME=校园管理员 \
   DEV_ADMIN_PASSWORD=e2e-admin-local-only \
   S3_BUCKET=life-ustc-e2e AWS_REGION=us-east-1 \
   AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
   AWS_ENDPOINT_URL_S3=http://127.0.0.1:9000 \
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
   bun .next/standalone/server.js
   ```

4. **Run tests**:
   ```bash
   bun run test:e2e
   ```

## Test Data

All seeded catalog data is defined in **`tests/e2e/fixtures/scenario.json`**.
Changes there propagate automatically to:
- `tools/dev/seed/dev-seed.ts` — TypeScript constants imported by tests
- `tools/dev/seed/seed-dev-scenarios.ts` — DB creation on every test run

To add a new seed entity: update `scenario.json`, update the seed script,
add/update the export in `dev-seed.ts`.

## Structure

```
tests/e2e/fixtures/             Canonical test data (scenario.json)
tests/e2e/src/app/**/test.ts    Route tests
tests/e2e/src/app/_shared/      Helpers
tests/e2e/utils/                Auth, DB, locks, subscriptions, uploads
```

## Helpers

```typescript
import { signInAsDebugUser, signInAsDevAdmin } from "../utils/auth";
import { expectRequiresSignIn } from "../utils/auth";
import { gotoAndWaitForReady } from "../utils/page-ready";
import { DEV_SEED } from "../utils/dev-seed";
```

## Test Shape

1. Route contract (loads, no 500, expected shell)
2. Behavior tests for user journeys
3. One test = one user story
4. Idempotent across repeated runs
5. Clean up created data

## Selectors

```typescript
// Prefer
page.getByRole("button", { name: "Submit" })
page.getByLabel("Email")
page.getByText("Welcome")

// Avoid
page.locator(".class") // brittle
```

## Flake Prevention

```typescript
// DO
await page.waitForResponse(url);
await expect(page).toHaveURL(/expected/);
await expect(element).toBeVisible();

// DON'T
await page.waitForTimeout(1000); // ❌ rejected by check:e2e
```

## Concurrency & Locks

Tests that mutate the debug user's profile use `withE2eLock("debug-user-profile", ...)`.
Files with multiple such tests use `test.describe.configure({ mode: "serial" })` to
prevent intra-file lock contention:

- `tests/e2e/src/app/welcome/test.ts`
- `tests/e2e/src/app/settings/profile/test.ts`

Lock timeout: 300 s. If you add a lock-mutating test to a new file, add serial mode.

## Coverage Priorities

- Permissions (anon, user, admin distinct)
- Subscription not enrollment
- Homework vs completion separation
- Upload authorization
