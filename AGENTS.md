# AGENTS.md

## Use This File As An Index

- Keep the root file minimal. Read the nearest scoped `AGENTS.md` for the files you touch; the closest file wins.
- If you add rules that only matter for one area, put them in that area's `AGENTS.md`, not here.

## Essential Commands

```yaml
install: bun install --frozen-lockfile
dev: bun run dev
check: bun run check --write
typecheck: bun run typecheck
unit_test: bun run test
integration_test: bun run test:integration  # requires DATABASE_URL + bun run dev:seed-scenarios
e2e: bun run test:e2e
features_doc_check: bun run check:features
prebuild: bun run prebuild
build_image: docker build .
```

## CI/CD

Workflows live in `.github/workflows/`. See `.github/workflows/AGENTS.md` for full details.

| Workflow | Trigger | Jobs |
|----------|---------|------|
| CI | push/PR to main | Check (lint + typecheck + unit), E2E (4 shards), Commitlint |
| CD | push to main | Docker Build → Docker Push, Prisma Deploy |
| Release | push to main | Changelog + version bump |
| Code Quality | push to main | Biome check |
| Copilot Setup Steps | copilot | Dependency pre-install |

**Known pitfalls from past upgrades:**
- `better-auth` social provider `mapProfileToUser` inline profile types must match the library's own profile types exactly — `GithubProfile.email` is `string | null`, not `string | undefined`; mismatches break typecheck and Docker Build.

## Generated Files

- Do not edit generated files manually:
  - `src/generated/prisma`
  - `public/openapi.generated.json`
  - `src/generated/openapi.ts`

## Documentation Order

- When behavior, capability, API, MCP surface, parameters, or outputs change, update `docs/features.yml` first.
- Then implement the project change.
- Then check `docs/features.yml`, relevant `AGENTS.md` files, and the code/tests for consistency before concluding.

## Scoped AGENTS.md Files

```yaml
scoped_agents:
  docs: docs/AGENTS.md
  github_workflows: .github/workflows/AGENTS.md
  src: src/AGENTS.md
  src_app: src/app/AGENTS.md
  src_app_api: src/app/api/AGENTS.md
  src_features: src/features/AGENTS.md
  src_components: src/components/AGENTS.md
  src_lib: src/lib/AGENTS.md
  src_lib_mcp: src/lib/mcp/AGENTS.md
  prisma: prisma/AGENTS.md
  tests_e2e: tests/e2e/AGENTS.md
  tests_integration: tests/integration/AGENTS.md
  tests_unit: tests/unit/AGENTS.md
  tools: tools/AGENTS.md
```
