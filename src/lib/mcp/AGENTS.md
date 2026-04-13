# src/lib/mcp/

- Scope
  - MCP server registration, OAuth resource metadata, auth verification and tool definitions
  - Keep MCP aligned with the Web and REST product model
  - Default focus is personal learning workspace; no admin tools by default

- Server and tools
  - Register tool groups in `src/lib/mcp/server.ts`
  - Tool files live under `src/lib/mcp/tools/`
  - Shared helpers live in `src/lib/mcp/tools/_helpers.ts`
  - Tool input uses Zod schemas
  - Tool output uses `jsonToolResult()`
  - Modes are `summary`, `default` and `full`; use `resolveMcpMode()` before branching on mode

- Auth and OAuth
  - Auth requires Bearer token with `MCP_TOOLS_SCOPE`
  - JWT and opaque OAuth tokens are both supported
  - MCP uses resource indicators; audience must match `/api/mcp`
  - Do not accept cookie sessions for MCP tools
  - Do not log access tokens, refresh tokens, client secrets or raw Authorization headers

- Data and permissions
  - Use base `prisma` for writes and locale-neutral reads
  - Use `getPrisma(locale)` for localized names
  - Personal tools must scope data to the authenticated user
  - Collaborative writes must enforce signed-in, unsuspended-user rules
  - Normal users do not mutate JW/import facts
  - Todo writes are personal user state; homework completion writes are per-user state

- Dates and output
  - Use `parseDateInput` for date inputs
  - Use `jsonToolResult()` so date serialization and compact modes stay consistent
  - Preserve section code, section number, semester and JW IDs when needed for disambiguation
  - Keep tool descriptions clear that section subscription is not official USTC course selection
