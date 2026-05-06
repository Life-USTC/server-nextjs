# src/

Source code organization.

## Structure

```
app/          App Router routes, layouts, pages
  api/        REST route handlers
features/     Business domain logic
components/   UI components
lib/          Infrastructure
  mcp/        MCP server
i18n/         Locale config
shared/       Pure utilities
hooks/        React hooks
generated/    DO NOT EDIT (Prisma, OpenAPI)
```

## Imports

```typescript
// Use @ aliases
import { prisma } from "@/lib/db/prisma";
import type { User } from "@/generated/prisma/client";
import { Link } from "@/i18n/routing";

// Relative for same folder
import { helper } from "./helper";
```

## React

- Server Components by default
- Add `"use client"` for hooks, browser APIs, events, client state
- Fetch independent data with `Promise.all()`

## Locales

- `zh-cn` (default), `en-us`
- No locale in URLs
- All user text needs both message files

See root `AGENTS.md` for auth, dates, Prisma, error patterns.
