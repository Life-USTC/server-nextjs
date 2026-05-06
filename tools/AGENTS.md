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

```bash
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

## Convention Checks

```bash
bun run check:e2e        # E2E conventions
bun run check:i18n-keys  # Translation keys
bun run check:features   # Feature docs
```
