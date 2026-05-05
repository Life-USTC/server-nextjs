# tests/unit/

- Scope
  - Vitest unit tests for pure helpers, schemas, serializers, query builders and small UI contracts
  - No live database, browser, running Next server or network access
  - Keep tests deterministic and fast; run with `bun run test`

- Conventions
  - Place tests beside the behavior area by name, not by implementation path mirroring
  - Prefer table tests for parser/schema/query-builder edge cases
  - Mock only process/env/time boundaries that the unit owns
  - Do not import app Prisma clients or generated Prisma runtime clients here
  - Use integration tests for real MCP tool calls and DB-backed behavior
  - Use E2E tests for browser routing, auth redirects, accessibility-visible flows and full-stack API contracts

- Coverage priorities
  - Date parsing/serialization and Shanghai day-boundary helpers
  - API schemas and query builders before route-handler behavior
  - Permission/auth helper edge cases without requiring a session
  - Compact/summary payload helpers for agent-facing surfaces
