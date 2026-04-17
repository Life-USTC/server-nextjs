# src/lib/

- Scope
  - Infrastructure layer and shared low-level helpers
  - No page-specific product logic
  - Put business behavior in `src/features/`

- `api/`
  - Use `jsonResponse()` to serialize dates
  - Use `handleRouteError()` for unexpected errors
  - Use response helpers for common status codes
  - Use `normalizePagination()` and `buildPaginatedResponse()`
  - Keep request schemas in `api/schemas/request-schemas.ts`
  - Keep response/model schemas aligned with OpenAPI generation

- `auth/`
  - `requireSignedInUserId()` redirects page users
  - `resolveApiUserId()` accepts OAuth Bearer token or Better Auth cookie session
  - Do not use page redirects in route handlers
  - Preserve final-account disconnect protection

- `db/`
  - Prisma client comes from `@/generated/prisma/client`
  - App Prisma instances come from `src/lib/db/prisma.ts`
  - Use `createPrismaAdapter()` with PostgreSQL adapter
  - Use base `prisma` for writes and locale-neutral reads
  - Use `getPrisma(locale)` for localized `namePrimary` / `nameSecondary`
  - Do not create ad hoc Prisma clients in app code
  - Scripts may create their own client and must disconnect

- `mcp/`
  - Server registers tool groups in `mcp/server.ts`
  - Tool files live under `mcp/tools/`
  - Auth requires Bearer token with MCP scope
  - JWT and opaque OAuth tokens are both supported
  - Tool input uses Zod schemas
  - Tool output uses `jsonToolResult()`
  - Modes are `summary`, `default` and `full`
  - Default focus is personal learning workspace
  - No admin tools by default
  - Match Web/API business rules

- `oauth/`
  - Better Auth OAuth provider owns client/token/consent models
  - Dynamic client registration is supported
  - MCP uses resource indicators and `MCP_TOOLS_SCOPE`
  - Redirect URI handling must stay strict
  - Debug logging must not leak secrets

- `storage/`
  - S3 uses the official AWS SDK and its default runtime configuration chain
  - `S3_BUCKET` names the upload bucket
  - Upload keys are scoped under `uploads/{userId}/...`
  - Signed URLs are transport only; app permissions still matter

- `security/`
  - CSP nonce is created in `src/proxy.ts`
  - Layout reads nonce from `x-csp-nonce`
  - Keep analytics scripts nonce-bound
  - Proxy excludes API and static paths

- `time/`
  - `src/lib/time/parse-date-input.ts` parses API/MCP date values
  - `src/lib/time/serialize-date-output.ts` prepares JSON-safe dates
  - Shanghai helpers drive display and dashboard day windows
  - Do not hand-roll timezone conversion in features

- Other rules
  - Use structured app/route logging helpers
  - Use shared pagination/search-param helpers
  - Use localized navigation wrappers from `i18n/routing`
  - Keep auth and permission checks explicit
  - Do not bypass upload authorization through raw S3 URLs
  - Keep API/MCP date serialization consistent
