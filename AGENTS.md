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
e2e: bun run test:e2e
prebuild: bun run prebuild
build_image: docker build .
```

## Generated Files

- Do not edit generated files manually:
  - `src/generated/prisma`
  - `public/openapi.generated.json`
  - `src/generated/openapi.ts`

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
  tools: tools/AGENTS.md
```
