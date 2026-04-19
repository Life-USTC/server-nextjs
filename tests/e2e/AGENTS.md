# tests/e2e/

- Scope
  - Playwright tests against the real built Next.js app
  - Test directory mirrors app routes
  - Test files use `test.ts`, `*.test.ts`, or `*.spec.ts`

- Web server
  - Config builds with `bun run build`, then starts with `bunx next start`
  - Defaults are host `127.0.0.1`, port `3000`, two local workers for the shared-state full suite and conservative CI workers for scoped jobs
  - Env knobs: `PLAYWRIGHT_HOST`, `PLAYWRIGHT_PORT`, `PLAYWRIGHT_REUSE_SERVER=1`, `PLAYWRIGHT_RETRIES`, `PLAYWRIGHT_WORKERS`
  - Benchmark workers with `bun run test:e2e:benchmark`; use focused paths for parallel-safe scopes when measuring CI-style slices
  - E2E auth env is enabled by config

- Layout
  - `tests/e2e/src/app/**/test.ts`: route-oriented tests
  - `tests/e2e/src/app/_shared/`: page and API contract helpers
  - `utils/`: auth, DB fixtures, seed constants, upload helpers and screenshots

- Helpers
  - `signInAsDebugUser()`: normal signed-in user
  - `signInAsDevAdmin()`: admin user
  - `expectRequiresSignIn()`: protected page checks
  - `gotoAndWaitForReady()`: navigation helper
  - `waitForUiSettled()`: post-navigation settling
  - `e2e-db.ts`: DB setup/cleanup through Bun eval with transient Bun crash retries
  - `DEV_SEED`: stable assertions

- Test shape
  - Start with route contract: loads, does not 500, shows expected shell
  - Add behavior tests for changed user journeys
  - One test should prove one user story
  - Prefer short happy paths
  - Create data through API or `e2e-db.ts`
  - Tests must be idempotent across repeated full-suite runs against the same database
  - Clean up data created by the test when practical, but never rely on global cleanup scripts to hide pollution
  - Shared seed users and seed JW/import facts may be read freely; tests that mutate user state must use isolated fixture users or stay inside a clearly serial stateful group
  - Prefer combining genuinely conflicting stateful checks into one linear test over blocking the whole suite

- API contracts
  - Public list/detail routes should return useful seed-backed data
  - Protected routes should return expected 400/401/403/404/405, not 500
  - iCal routes should return `text/calendar` and `BEGIN:VCALENDAR`
  - OpenAPI route should return OpenAPI `3.0.0`

- Coverage priorities
  - Section subscription must not read as official enrollment
  - Dashboard reflects current-semester subscriptions and recoverable empty states
  - Stale-semester subscriptions do not masquerade as current work
  - Homework and per-user completion stay separate
  - Todos are personal
  - Cross-semester and same-course cases show disambiguation
  - Anonymous, signed-in, suspended and admin permissions are distinct
  - Comment anonymity differs for normal user vs admin context
  - Upload/download authorization cannot be bypassed by URL access
  - API and MCP behavior match Web rules where exposed

- Selectors and flake rules
  - Prefer `getByRole`, `getByLabel`, `getByText`, then `data-testid`
  - Avoid brittle class selectors
  - Keep tests compatible with `en-us` and `zh-cn` where copy varies
  - Do not use `waitForTimeout()`
  - Prefer `waitForResponse`, `toHaveURL`, `toBeVisible` and `expect(...).toPass()`
  - Use route aliases from auth helpers for settings redirects

- Screenshots
  - `captureStepScreenshot()` is opt-in with `E2E_CAPTURE_STEPS=1`
  - Screenshot artifacts should aid layout review, not replace assertions
  - Failure screenshots and first-retry traces remain enabled by Playwright config

- Commands
  - All E2E: `bun run test:e2e`
  - Worker benchmark: `bun run test:e2e:benchmark`
  - Focused E2E: `bun run test:e2e -- tests/e2e/src/app/api/todos`
  - Headed: `bun run test:e2e:headed`
  - UI: `bun run test:e2e:ui`
  - Convention check: `bun run check:e2e`
