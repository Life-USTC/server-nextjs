# tests/integration/

Integration tests with in-process MCP harness.

## Setup

```bash
# Requires DATABASE_URL; test:integration applies the seed automatically.
bun run test:integration
```

## Harness

```typescript
import { createMcpHarness } from "../utils/mcp-harness";
import { DEV_SEED } from "../utils/seed-constants";
import { prisma } from "@/lib/db/prisma";

let harness, userId;

beforeAll(async () => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { username: DEV_SEED.debugUsername },
  });
  userId = user.id;
  harness = await createMcpHarness(userId);
});

afterAll(async () => {
  await harness.close();
  await prisma.$disconnect();
});

test("list_my_todos", async () => {
  const result = await harness.callTool("list_my_todos", {});
  expect(result.todos).toBeInstanceOf(Array);
});
```

## Conventions

- Seed anchor date: `2026-04-29`
- Pass `atTime: "2026-04-29T08:00:00+08:00"` for time-sensitive tools
- Write mutations use unique markers `[integration-test] ...`
- Clean up created data within test group
- Read-only assertions against seed need no cleanup

## Relationship to Other Layers

- **Unit**: Pure functions, no DB
- **Integration**: DB required, in-process MCP
- **E2E**: Browser + built server
