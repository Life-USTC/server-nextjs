# src/lib/mcp/

MCP server and tools.

## Structure

```
server.ts        MCP server registration
tools/           Tool implementations
  _helpers.ts    Shared utilities
  dashboard.ts
  homework.ts
  ...
```

## Tool Pattern

```typescript
import { z } from "zod";
import { jsonToolResult, toolError, resolveMcpMode } from "./_helpers";

const inputSchema = z.object({
  sectionJwId: z.number().describe("Section JW ID"),
  mode: z.enum(["summary", "default", "full"]).optional(),
});

export async function myTool(args: unknown, authInfo: { userId: string }) {
  try {
    const input = inputSchema.parse(args);
    const mode = resolveMcpMode(input.mode);
    
    // Business logic
    const result = await doWork(authInfo.userId, input);
    
    return jsonToolResult(result, mode);
  } catch (error) {
    return toolError("Failed to do work", error);
  }
}
```

## Mode Guidance

- **summary**: Counts, top samples
- **default**: Standard agent calls
- **full**: Complete nested records

## Auth

- Bearer token required (no cookies)
- Audience must match `/api/mcp`
- `authInfo.userId` injected by middleware

## Tool Descriptions

```typescript
server.addTool({
  name: "my_tool",
  description: "When to use this tool (not exhaustive return shape)",
  inputSchema: zodToJsonSchema(inputSchema),
  handler: myTool,
});
```

## Patterns

```typescript
// Writes
await prisma.model.create({ data });

// Localized reads
const localPrisma = getPrisma(locale);
await localPrisma.model.findMany();

// Dates
import { flexDateInputSchema } from "@/lib/mcp/schemas";
import { parseDateInput } from "@/lib/time/parse-date-input";

// Output
return jsonToolResult(data, mode); // handles dates + compaction
```

## Permissions

- Personal tools scope to `authInfo.userId`
- Check suspension for collaborative writes
- Normal users don't mutate JW/import facts

See root `AGENTS.md` for auth, dates, Prisma, errors.
