# tools/

- Scope
  - Development scripts, import scripts, generated-artifact helpers and convention checks
  - Not request-time app code
  - `shared/`: helper code used by tool scripts
  - `build/openapi/`: build-time OpenAPI generation, postprocessing and type shim scripts
  - `dev/check/`: local convention and diagnostic checks
  - `dev/util/`: local development utilities
  - `dev/seed/`: development seed data, reset and E2E scenario scripts
  - `production/load/`: production import/load scripts
  - `production/util/`: production maintenance utilities

- Runtime
  - Use `bun` / `bunx` only
  - Load env with `dotenv/config` when needed
  - Scripts that instantiate Prisma should use `PrismaClient`, use `createPrismaAdapter()` and disconnect when complete

- Seed scripts
  - `dev/seed/seed-dev-scenarios.ts` creates stable debug users and current-semester course/section/schedule/exam scenarios
  - Seed scenarios should include homework, completion, todo, comment, upload and suspension cases when relevant
  - `dev/seed/reset-dev-scenarios.ts` removes scenario data
  - Seed IDs use high JW ranges to avoid real imported data collisions
  - Seed text should remain stable for E2E assertions

- Import scripts
  - `production/load/load-from-static.ts` imports SQLite snapshot data and supports cache, snapshot URL override, minimum semester filter and skipped course/bus import
  - Course import should preserve JW/import facts
  - Synthetic IDs must remain stable
  - China-local date conversion should stay centralized in script helpers
  - Bus import should go through `src/features/bus/lib/bus-import.ts`
  - Bus version/checksum should make repeated imports safe

- OpenAPI and checks
  - `build/openapi/postprocess-spec.ts` runs after the custom OpenAPI generator
  - `bun run prebuild` runs Prisma generate, OpenAPI generate and OpenAPI type generation
  - `dev/check/check-e2e-conventions.ts` rejects `waitForTimeout()`, committed skipped E2E tests and direct Prisma imports in Playwright tests
  - `dev/check/check-i18n-keys.ts` checks translation key availability across `src` and `messages`

- Data rules
  - Seed current-semester dashboard cases
  - Seed no-subscription or stale-semester edge cases when changed
  - Seed cross-semester disambiguation cases when relevant
  - Seed section subscription separately from JW facts
  - Seed homework separately from per-user completion
  - Seed personal todos separately from section homework
  - Cover admin, moderation, upload, OAuth and MCP edge cases when changed
