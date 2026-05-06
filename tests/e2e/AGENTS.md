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

## Setup

- Build: `bun run build`
- Server: `bun .next/standalone/server.js`
- Workers: 2 local, conservative CI
- E2E auth enabled by config

## Structure

```
tests/e2e/src/app/**/test.ts   Route tests
tests/e2e/src/app/_shared/     Helpers
utils/                          Auth, DB, seeds
```

## Helpers

```typescript
import { signInAsDebugUser, signInAsDevAdmin } from "../utils/auth";
import { expectRequiresSignIn } from "../utils/auth";
import { gotoAndWaitForReady } from "../utils/navigation";
import { DEV_SEED } from "../utils/seed-constants";
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

## Coverage Priorities

- Permissions (anon, user, admin distinct)
- Subscription not enrollment
- Homework vs completion separation
- Upload authorization
