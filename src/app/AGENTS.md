# src/app/

- Scope
  - Next.js App Router pages and route handlers
  - Keep files thin
  - Put reusable business logic in `src/features/`
  - Put infrastructure helpers in `src/lib/`

- App Router notes
  - `searchParams` may be a Promise
  - `params` may be a Promise
  - Use `generateMetadata()` with translations
  - Use `export const dynamic = "force-dynamic"` for dynamic pages/routes
  - Use `export const runtime = "nodejs"` when Node APIs or MCP transport need it

- Page rules
  - `/` is the signed-in dashboard and anonymous public bus/links entry
  - Course, section and teacher pages are public browsing surfaces
  - Section pages must not imply official course enrollment
  - `/welcome` is required when a signed-in user lacks name or username
  - `/signin` may expose dev debug providers only in dev/E2E mode
  - `/settings` is personal account/content/upload/danger management
  - `/oauth/authorize` must show app, scopes, approve and deny actions
  - `/admin/*` is admin only and needs clear feedback for high-risk actions
  - `/comments/[id]` redirects to the target object anchor
  - Keep `#main-content` visible for page contracts

- API route rules
  - Use `jsonResponse()` for JSON
  - Use `handleRouteError()` for unexpected failures
  - Use typed helpers such as `badRequest`, `unauthorized`, `forbidden`, `notFound` and `payloadTooLarge`
  - Validate request bodies and query params with schemas from `src/lib/api/schemas`
  - Use `parseInteger` / `parseOptionalInt` for integer params after schema parsing
  - Use `buildPaginatedResponse()` for paginated lists
  - Keep auth checks before mutation
  - Use `resolveApiUserId()` when Bearer token and cookie sessions are both valid inputs
  - MCP route is Bearer-token only

- OpenAPI route annotations
  - Keep annotations above handlers: `@params`, `@pathParams`, `@body`, `@response`
  - Use schema names from API schema files
  - After API changes run `bun run prebuild`

- iCal routes
  - Return valid calendar content even for empty event sets
  - Preserve section and personal feed semantics
  - Calendar feed token belongs to user

- Page composition
  - Use shared page layout components where possible
  - Load anonymous home bus data unless links tab is explicitly selected
  - Use route aliases consistently with E2E helpers
