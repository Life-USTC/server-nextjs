# Life@USTC Server - Agent Guide

Next.js campus workspace with REST + MCP APIs.

## Commands

```bash
# Development
bun install --frozen-lockfile
bun run dev

# Quality
bun run check --write        # Lint + format
bun run typecheck           # TypeScript
bun run check:features      # Validate feature docs

# Tests
bun run test                # Unit
bun run test:integration    # Integration (needs DATABASE_URL + seed)
bun run test:e2e            # E2E (full build)

# Build
bun run prebuild            # Generate Prisma + OpenAPI
bun run build
docker build .
```

## Documentation Structure

```
docs/features/          Feature specs (modular YAML)
  _meta.yml            Product metadata
  _product.yml         Roles, workflow
  _models.yml          Prisma models
  _ui.yml              UI patterns
  user.yml             26 feature modules
  course.yml           ...
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

**Feature Changes**:
1. Update `docs/features/<module>.yml` first
2. Implement code
3. Run `bun run check:features`
4. Update tests

**No Stray Reports**:
- Do not leave migration plans, improvement reports, or status summaries in the repo
- Temporary planning files are acceptable only if removed before finishing
- Use GitHub issues/PRs for durable tracking

## Scoped Guides

- **Features**: `docs/features/<module>.yml` - Specifications
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
