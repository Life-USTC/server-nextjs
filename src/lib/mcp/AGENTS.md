# src/lib/mcp/

- Scope
  - MCP server registration, OAuth resource metadata, auth verification and tool definitions
  - Keep MCP aligned with the Web and REST product model
  - Default focus is personal learning workspace; no admin tools by default

- Server and tools
  - Register tool groups in `src/lib/mcp/server.ts`
  - Tool files live under `src/lib/mcp/tools/`
  - Shared helpers live in `src/lib/mcp/tools/_helpers.ts`
  - Tool input uses Zod schemas; add `.describe()` on shared/ambiguous fields because clients see it as JSON Schema
  - Tool output uses `jsonToolResult()`
  - Modes are `summary`, `default` and `full`; use `resolveMcpMode()` before branching on mode
  - Mode guidance: `summary` for counts/top samples, `default` for most agent calls, `full` only for exact nested records
  - Tool descriptions should say when to use the tool, not exhaustively restate its return shape
  - Avoid repeating auth context in descriptions (`my_` and OAuth already imply the caller)

- Auth and OAuth
  - Auth requires Bearer token with `MCP_TOOLS_SCOPE`
  - MCP uses resource indicators; audience must match `/api/mcp`
  - Resource-bound JWT access tokens are accepted
  - Opaque tokens that cannot prove MCP audience binding are rejected with `invalid_token`
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
  - Use `flexDateInputSchema` for MCP date/datetime string inputs and parse with `parseDateInput` / `parseRequiredDateInput`
  - Use `jsonToolResult()` so date serialization and compact modes stay consistent
  - Preserve section code, section number, semester and JW IDs when needed for disambiguation
  - Keep tool descriptions clear that section subscription is not official USTC course selection

- Common tool workflows
  - Student snapshot: `get_my_dashboard` first, then fan out to `get_next_class`, `get_upcoming_deadlines`, `list_my_todos`, or `list_my_calendar_events`
  - Subscribe by code: `get_current_semester` → `match_section_codes` for preview → `subscribe_my_sections_by_codes` after confirmation
  - Subscribe by search: `search_courses` or `search_sections` → `subscribe_section_by_jw_id`
  - Section detail: `get_section_by_jw_id` first, then `list_schedules_by_section`, `list_homeworks_by_section`, or `list_exams_by_section`
  - Bus: `get_next_buses` for next departures, `list_bus_routes` before `get_bus_route_timetable`, `query_bus_timetable` only for full local processing
