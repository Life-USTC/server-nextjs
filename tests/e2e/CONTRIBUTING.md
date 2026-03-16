# E2E Contributing Guide

This suite is not a generic Playwright sandbox. It tests a real Next.js app with seeded data, real auth wiring, and route-level behavior. New tests should follow the same shape so they stay readable and stable.

## Goals

- Cover the shortest user-visible path that proves a feature works.
- Prefer stable product behavior over implementation details.
- Keep shared mutable state under control.
- Make failures explain product regressions, not test harness noise.

## File Layout

- Put page tests under `tests/e2e/src/app/**/test.ts`.
- Mirror the app route structure where possible.
- Put API route tests under `tests/e2e/src/app/api/**/test.ts`.
- Reuse shared contract helpers in:
  - `tests/e2e/src/app/_shared/page-contract.ts`
  - `tests/e2e/src/app/_shared/api-contract.ts`
- Reuse shared utilities in:
  - `tests/e2e/utils/auth.ts`
  - `tests/e2e/utils/page-ready.ts`
  - `tests/e2e/utils/e2e-db.ts`
  - `tests/e2e/utils/dev-seed.ts`
  - `tests/e2e/utils/uploads.ts`

## Test Design Rules

1. Start with the route contract, then add behavior tests.
2. One test should prove one user story or one API contract branch.
3. Prefer one short happy-path flow over a long “kitchen sink” test.
4. Add destructive flows only if the test cleans up after itself.
5. If a feature is route-alias-heavy, use shared helpers instead of hardcoding URLs.

Good examples:

- Page contract + targeted interaction:
  [tests/e2e/src/app/dashboard/links/test.ts](/Users/tiankaima/Source/life-ustc/server-nextjs/tests/e2e/src/app/dashboard/links/test.ts)
- API flow with fixture setup:
  [tests/e2e/src/app/api/oauth/token/test.ts](/Users/tiankaima/Source/life-ustc/server-nextjs/tests/e2e/src/app/api/oauth/token/test.ts)
- UI flow with state restore:
  [tests/e2e/src/app/welcome/test.ts](/Users/tiankaima/Source/life-ustc/server-nextjs/tests/e2e/src/app/welcome/test.ts)

## Navigation And Readiness

- Use `gotoAndWaitForReady(page, url)` for navigation.
- Use `waitForUiSettled(page)` after transitions when the page can still be hydrating.
- Do not replace these helpers with ad hoc `page.goto()` unless the route truly needs a special wait mode.
- Default expectation is `#main-content` visible. If the route should redirect or 404 before that, pass `expectMainContent: false`.

## Authentication

- Use `signInAsDebugUser(page, callbackPath?, expectedPath?)` for normal-user flows.
- Use `signInAsDevAdmin(page, callbackPath?, expectedPath?)` for admin-only flows.
- Use `expectPagePath()` when redirect aliases exist.
- Do not reimplement debug login clicks inline unless the test is explicitly about `/signin`.

## Data And Fixtures

- Prefer seeded scenario data from `DEV_SEED` when a stable fixture already exists.
- If the scenario needs DB setup or cleanup, use `tests/e2e/utils/e2e-db.ts`.
- Keep fixture helpers narrowly scoped to test needs.
- Clean up everything you create.
- Do not import app Prisma objects directly into Playwright tests. Use the subprocess-backed helpers in `e2e-db.ts` instead.

When to use each source:

- `DEV_SEED`: stable read-only expectations.
- `page.request`: create and verify app-visible records through public APIs.
- `e2e-db.ts`: setup/cleanup or fixture states that are hard to reach through the UI.

## Selectors

- Prefer accessible selectors first:
  - `getByRole`
  - `getByLabel`
  - `getByPlaceholder`
  - `getByText`
- Use exact or anchored label patterns when broad i18n regexes would match multiple controls.
- Scope selectors to the nearest meaningful container before clicking destructive actions.
- Use `data-testid` only when semantic selectors are not robust enough.

Bad:

```ts
await page.locator("button").nth(3).click();
```

Better:

```ts
await page.getByRole("button", { name: /创建客户端|Create Client/i }).click();
```

Best when repeated labels exist:

```ts
const row = page
  .getByText(clientName, { exact: true })
  .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
await row.getByRole("button", { name: /删除|Delete/i }).click();
```

## Assertions

- Assert the behavior that matters:
  - final URL
  - visible state
  - API response status
  - persisted record when needed
- Do not over-assert every text node on the page.
- For API tests, assert response body fields that define the contract, not unrelated payload shape.
- If the test mutates data, verify the mutation through the app-facing API or a focused fixture helper.

## Flake Prevention

- Do not use `waitForTimeout()` unless there is no observable signal and you document why.
- Prefer:
  - `waitForResponse`
  - `toHaveURL`
  - `toBeVisible`
  - `toHaveAttribute`
  - `waitForLoadState("networkidle")`
- If you need polling for eventual consistency, keep it local and bounded.
- If a test depends on mutable seeded state, either restore it or make the file serial.

## Serial Vs Parallel

- Default: keep tests parallel-safe.
- Use `test.describe.configure({ mode: "serial" })` only when tests intentionally mutate shared records and restoring around every case is not worth the complexity.
- If a test creates unique records with `Date.now()` or random suffixes and cleans them up, it should usually stay parallel-safe.

## Screenshots

- Use `captureStepScreenshot(page, testInfo, name)` at meaningful milestones.
- Do not add screenshots after every click.
- Good moments:
  - post-login landing
  - dialog open
  - successful mutation
  - final redirected state

## What To Cover

For a new page or feature, aim for this order:

1. Route contract exists and does not 500.
2. Auth boundary is tested if the route is protected.
3. One shortest happy path is covered.
4. One important failure or denial branch is covered if risk is high.
5. Cleanup is explicit for any created data.

High-priority features should usually have both page and API coverage if both surfaces exist.

## E2E Vs Lower-Level Tests

- Keep pure parsing, formatting, schema, and state-machine logic in unit or integration tests.
- Use e2e when the behavior depends on routing, auth, browser APIs, server actions, or multiple layers working together.
- If a behavior can be proven without a browser, prefer the lower-level test and keep e2e to one shortest end-to-end proof.

## Updating Coverage Notes

- If you add meaningful route or feature coverage, update:
  [tests/e2e/COVERAGE.md](/Users/tiankaima/Source/life-ustc/server-nextjs/tests/e2e/COVERAGE.md)
- Treat it as the suite’s audit log, not marketing copy.
- If coverage is still partial, mark it partial.

## Review Checklist

Before merging new e2e tests, check:

- The test file is in the route-aligned location.
- Shared helpers are used instead of duplicated login/navigation code.
- Selectors are semantic and scoped.
- There is no unnecessary `waitForTimeout()`.
- Created records are cleaned up.
- The behavior is asserted at the right level.
- `COVERAGE.md` is updated if route/feature coverage changed.

## Commands

Run a focused file or directory first:

```bash
npm run test:e2e -- tests/e2e/src/app/api/todos
```

Run multiple focused specs:

```bash
npm run test:e2e -- tests/e2e/src/app/welcome/test.ts tests/e2e/src/app/admin/oauth/test.ts
```

Run the suite convention check before broad refactors:

```bash
npm run check:e2e
```

Avoid launching multiple Playwright runs in parallel against the same local dev server port.
