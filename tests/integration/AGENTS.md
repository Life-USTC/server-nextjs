# tests/integration/

- Scope
  - Vitest integration tests against a live database with an in-process MCP harness
  - No browser, no running HTTP server — just direct tool handler invocations with injected auth
  - Fast (~1–2 s per run) because no network or build step is required

- Setup
  - Requires a reachable PostgreSQL database with DATABASE_URL configured
  - The vitest.integration.config.ts loads `.env` automatically; no manual export needed
  - Dev seed must be applied: `bun run dev:seed-scenarios`
  - Run: `bun run test:integration`

- Harness (`utils/mcp-harness.ts`)
  - `createMcpHarness(userId)` spins up an InMemoryTransport pair + real McpServer
  - Patches `clientTransport.send` to inject AuthInfo so every MCP request is seen as authenticated
  - Returns `{ callTool, call, close }`:
    - `callTool(name, args)` — calls a tool and returns the parsed JSON payload
    - `call<T>(name, args)` — same but typed, casts result to T
    - `close()` — tears down the in-process session

- Conventions
  - One `beforeAll` creates a shared harness; one `afterAll` closes it and disconnects prisma
  - Use `DEV_SEED.debugUsername` to look up the dev user ID at test start
  - Seed anchor date is `2026-04-29`; pass `atTime: "2026-04-29T08:00:00+08:00"` to
    time-sensitive tools so assertions hold regardless of when CI runs
  - Write mutations use unique titles/markers (e.g. `[integration-test] ...`) to avoid
    collisions with the shared seed data
  - Clean up created data within the same test group (create → assert → delete)
  - Read-only assertions against seed data require no cleanup

- Relationship to other test layers
  - Unit tests (`bun run test`): pure function tests, no DB — fast, always run in CI
  - Integration tests (`bun run test:integration`): DB required, in-process MCP — run locally
    and in CI stages that have a DB service
  - E2E tests (`bun run test:e2e`): browser + built server required — heaviest, full stack
