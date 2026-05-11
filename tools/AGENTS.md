# tools/

Build, seed, import scripts.

## Structure

```
shared/              Helper code
build/openapi/       OpenAPI generation
dev/check/           Convention checks
dev/seed/            Dev seed data
production/load/     Production imports
```

## Prisma in Scripts

```typescript
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "@/lib/db/adapter";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = createPrismaAdapter(pool);
const prisma = new PrismaClient({ adapter });

try {
  await prisma.$connect();
  // work
} finally {
  await prisma.$disconnect();
  await pool.end();
}
```

## Seed

Start local infra first when a script needs DB/storage:

```bash
docker compose -f docker-compose.dev.yml up -d
bun run dev:seed-scenarios  # Create
bun run dev:seed:reset      # Clean
```

Seed data:
- Debug users (admin, normal, suspended)
- Current-semester scenarios
- Anchor date: `2026-04-29`

## Import

```bash
bun tools/production/load/load-from-static.ts
```

- Import from SQLite snapshot
- Preserve JW facts
- Bus import via `src/features/bus/lib/bus-import.ts`

## OpenAPI

```bash
bun run prebuild  # Generate + postprocess
```

## Verification

Default path for tool changes:

```bash
bun run verify:fast  # Most edits
bun run verify:full  # Shared tooling, seed flows, or integration-sensitive edits
```

## Convention Checks

```bash
bun run check:all      # Lint + docs + i18n + route/static import checks
bun run check:e2e      # E2E conventions
bun run check:features # Feature docs
bun run check:features:write # Refresh docs/features.generated.json
```
