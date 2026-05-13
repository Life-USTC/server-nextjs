# tests/e2e/

Playwright browser tests.

## Commands

Use the root `AGENTS.md` command list for the canonical E2E workflow. Common
focused variants still include:

```bash
bun run test:e2e -- path/to/test
PLAYWRIGHT_REUSE_SERVER=1 bun run test:e2e -- path/to/test
bun run test:e2e:headed
bun run test:e2e:ui
```

## Local Setup

Use the root `AGENTS.md` for the shared setup flow. E2E-only caveats:

- `bun run dev:minio:e2e` starts the standalone MinIO variant used by CI when
  you do not want the full local dev stack.
- Playwright bootstrap handles standalone prep, default auth env, and the
  `life-ustc-e2e` bucket automatically unless you override `PLAYWRIGHT_S3_BUCKET`.
- `bun run test:e2e:server` keeps the standalone server hot; pair it with
  `PLAYWRIGHT_REUSE_SERVER=1` for focused reruns.

## Test Data

Use the repo root `AGENTS.md` for the canonical shared seed/setup flow and
`DEV_SEED_ANCHOR` guidance. E2E-specific fixture edits still follow this path:

- Update `tests/e2e/fixtures/scenario.json`
- Update `tools/dev/seed/seed-dev-scenarios.ts` if new entities must be created
- Update `tools/dev/seed/dev-seed.ts` when tests need a named export

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
