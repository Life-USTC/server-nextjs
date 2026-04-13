# tools/

- Scope
  - Development scripts, import scripts, generated-artifact helpers and convention checks
  - Not request-time app code

- Runtime
  - Use `bun` / `bunx` only
  - Load env with `dotenv/config` when needed
  - Scripts that instantiate Prisma should use `PrismaClient`, use `createPrismaAdapter()` and disconnect when complete

- Seed scripts
  - `seed-dev-scenarios.ts` creates stable debug users and current-semester course/section/schedule/exam scenarios
  - Seed scenarios should include homework, completion, todo, comment, upload and suspension cases when relevant
  - `reset-dev-scenarios.ts` removes scenario data
  - Seed IDs use high JW ranges to avoid real imported data collisions
  - Seed text should remain stable for E2E assertions

- Import scripts
  - `load-from-static.ts` imports SQLite snapshot data and supports cache, snapshot URL override, minimum semester filter and skipped course/bus import
  - Course import should preserve JW/import facts
  - Synthetic IDs must remain stable
  - China-local date conversion should stay centralized in script helpers
  - Bus import should go through `src/features/bus/lib/bus-import.ts`
  - Bus version/checksum should make repeated imports safe

- OpenAPI and checks
  - `openapi-postprocess.ts` runs after `next-openapi-gen`
  - `bun run prebuild` runs Prisma generate, OpenAPI generate and OpenAPI type generation
  - `check-e2e-conventions.ts` rejects `waitForTimeout()`, committed skipped E2E tests and direct Prisma imports in Playwright tests
  - `check-i18n-keys.ts` checks translation key availability across `src` and `messages`

- Data rules
  - Seed current-semester dashboard cases
  - Seed no-subscription or stale-semester edge cases when changed
  - Seed cross-semester disambiguation cases when relevant
  - Seed section subscription separately from JW facts
  - Seed homework separately from per-user completion
  - Seed personal todos separately from section homework
  - Cover admin, moderation, upload, OAuth and MCP edge cases when changed
