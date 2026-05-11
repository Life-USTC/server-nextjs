# Life@USTC Server - Agent Guide

Next.js campus workspace with REST + MCP APIs.

## Commands

```bash
# Development
bun install --frozen-lockfile
bun run dev        # Host app dev; auto-runs prisma generate + migrate deploy
bun run dev:infra  # Infra only (postgres, minio, minio-setup)
bun run dev:docker # Full dev stack in Docker
bun run dev:down   # Stop dev Docker stack

# Quality
bun run check --write        # Lint + format fixes
bun run verify:fast         # Default local gate: checks + prebuild + typecheck + unit tests
bun run verify:full         # Full gate: fast verification + integration + E2E
bun run verify:e2e          # E2E prerequisites before Playwright

# Tests
bun run test                # Unit only
bun run test:integration    # Integration (needs DATABASE_URL + seed)
bun run test:e2e            # E2E (full build)

# Build
bun run prebuild            # Generate Prisma + OpenAPI
bun run build
docker build .
```

## Local Dev Environment

- `.env` is configured for host-native dev (`bun run dev`) against local Docker infra on `127.0.0.1`.
- `docker-compose.dev.yml` can also run the Next.js dev server via profile `app`; in that mode Compose overrides `DATABASE_URL` and S3 endpoint to use service DNS names.
- `minio-setup` auto-creates bucket `life-ustc-dev` and exits successfully; that is expected.
- Both host-native `bun run dev` and compose app dev auto-run `prisma generate` + `prisma migrate deploy` before `next dev`.
- The compose app exposes a healthcheck via `bun run health`.
- Host-native `bun run dev` and compose app dev both use port `3000`; run only one app server at a time.
- Prefer these flows for pain-free setup:
  1. `bun run dev:docker` for one-command full stack
  2. `bun run dev:infra && bun run dev` for host-native app dev

## Documentation Structure

```
docs/features/          Feature specs (modular JSON)
  _meta.json           Product metadata
  _product.json        Roles, workflow
  _models.json         Prisma models
  _enums.json          Enums
  _ui.json             UI patterns
  _cases.json          Cross-feature scenarios
  _audit.json          Audit actions
  user.json            Feature modules
  course.json          ...
  ...

src/*/AGENTS.md         Scoped implementation guides
```

## Common Patterns

### Auth
- **Pages**: `requireSignedInUserId()` → redirects to `/signin`
- **API/MCP**: `resolveApiUserId()` → accepts Bearer OR cookie
- **MCP**: Bearer only, audience `/api/mcp`
- Check permissions BEFORE mutations
- Suspended users blocked from collaborative writes

### Dates
- **Input**: `parseDateInput(str)` accepts YYYY-MM-DD or ISO
- **Output**: `jsonResponse(data)` serializes dates
- **Display**: `getShanghaiDay()` for boundaries

### Prisma
- **Import**: `import { prisma, getPrisma } from "@/lib/db/prisma"`
- **Writes**: `prisma.model.create()`
- **Localized reads**: `getPrisma(locale).model.findMany()`
- **Scripts**: Create own client, disconnect after use

### Errors
- **API**: `handleRouteError(err)`
- **Status**: `unauthorized()`, `forbidden()`, `notFound()`, `badRequest()`
- **MCP**: `toolError(msg, err)`

### i18n
- Supported: `zh-cn` (default), `en-us`
- No locale prefix in URLs
- User text needs both message files
- **Import**: `import { Link } from "@/i18n/routing"`

### Validation
```typescript
const schema = z.object({ name: z.string().min(1) });
const data = schema.parse(input);
```

### Pagination
```typescript
buildPaginatedResponse(items, total, page, limit)
```

## File Rules

**Generated - DO NOT EDIT**:
- `src/generated/prisma/`
- `src/generated/openapi.ts`
- `public/openapi.generated.json`
- `docs/features.generated.json`

**Feature Changes**:
1. Update `docs/features/<module>.json` first
2. Implement code
3. Run `bun run verify:fast`
4. Update tests, then escalate to `bun run verify:full` when the change touches integration or browser flows

**Documentation Changes**:
- Ask before broad documentation rewrites or restructures when the user did not explicitly request doc edits.
- When docs must change as part of code work, keep the edits narrow and run the same default gate.

**Default Verification**:
- Use `bun run verify:fast` for most commits and PR updates.
- Use `bun run verify:full` before pushing changes that affect data flows, auth, browser flows, docs contracts, or shared tooling.
- Use `bun run verify:e2e` before `bun run test:e2e`; Playwright still requires the right local stack and env.

**No Stray Reports**:
- Do not leave migration plans, improvement reports, or status summaries in the repo
- Temporary planning files are acceptable only if removed before finishing
- Use GitHub issues/PRs for durable tracking

## Scoped Guides

- **Features**: `docs/features/<module>.json` - Specifications
- **Source**: `src/AGENTS.md` - Organization
- **App**: `src/app/AGENTS.md` - App Router
- **API**: `src/app/api/AGENTS.md` - REST handlers
- **MCP**: `src/lib/mcp/AGENTS.md` - MCP tools
- **Features**: `src/features/AGENTS.md` - Business logic
- **Components**: `src/components/AGENTS.md` - UI
- **Prisma**: `prisma/AGENTS.md` - Schema
- **Tests**: `tests/{e2e,integration,unit}/AGENTS.md`
- **Tools**: `tools/AGENTS.md` - Scripts
- **CI/CD**: `.github/workflows/AGENTS.md`

## Known Issues

**Better Auth social providers**: Profile types must match library exactly:
- `GithubProfile.email` is `string | null` not `string | undefined`
- Mismatches break typecheck and Docker build
