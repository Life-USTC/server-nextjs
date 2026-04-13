# src/app/api/

- Scope
  - REST route handlers and protocol endpoints under the App Router
  - Keep handlers thin; move reusable business behavior to `src/features/`
  - Keep infrastructure behavior in `src/lib/`

- Handler rules
  - Use `jsonResponse()` for JSON so date serialization stays consistent
  - Use `handleRouteError()` for unexpected failures
  - Use typed helpers such as `badRequest`, `unauthorized`, `forbidden`, `notFound` and `payloadTooLarge`
  - Validate request bodies and query params with schemas from `src/lib/api/schemas`
  - Use `parseInteger` / `parseOptionalInt` for integer params after schema parsing
  - Use `buildPaginatedResponse()` for paginated lists
  - Return status responses from route handlers; do not use page redirects

- Auth and access
  - Keep auth checks before mutation
  - Use `resolveApiUserId()` when Bearer token and cookie sessions are both valid inputs
  - MCP route is Bearer-token only
  - OAuth client access must follow authorized REST/MCP capabilities, not admin defaults
  - Suspended users cannot perform collaborative writes

- API surface
  - Keep REST behavior aligned with Web and MCP for the same capability
  - Do not create a separate API product model
  - Section subscription must not be described as official USTC course selection
  - Preserve section code, section number, semester and JW IDs where needed for disambiguation

- OpenAPI
  - Keep annotations above handlers: `@params`, `@pathParams`, `@body`, `@response`
  - Use schema names from API schema files
  - After API changes run `bun run prebuild`

- Dates
  - Use `parseDateInput` for API date input
  - Return dates through `jsonResponse()` or shared serialization helpers
  - Date-only JW data should preserve the stored calendar date
