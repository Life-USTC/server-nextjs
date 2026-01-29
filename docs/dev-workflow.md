# Development Workflow

## Why This Workflow
The project relies on strict TypeScript, Prisma type safety, and localized UI. This workflow keeps API contracts and UI strings consistent while minimizing regressions.

## Daily Development
1. Start the dev server with `bun run dev`.
2. Make changes in `src/` following existing patterns.
3. Run `bun run check` (or let the pre-commit hook run `bun run check --write`).
4. Use `bun run format` when you only want formatting without lint fixes.

## Git Hooks
Install the pre-commit hook with `bun run hooks:install` to run Biome automatically.

## Database Work
When you change `prisma/schema.prisma`:
1. Generate the client with `bun run prisma:generate`.
2. Create and apply migrations with `bun run prisma:migrate`.
3. Use `bun run prisma:studio` for local inspection.

## Data Loading (Local)
`bun run tools/load-from-static.ts` loads data from the Life-USTC/static repository into the database.

## Conventions That Affect Workflow
- Use `@/` import alias for `src/`.
- Validate numeric inputs with `parseInt()` and `Number.isNaN()`.
- Update `messages/en-us.json` and `messages/zh-cn.json` together for any user-facing text.
- Avoid editing auto-generated UI components in `src/components/ui/`.

## Testing
No test framework is currently configured.
- Single-test runs are not available until a test runner is added.
