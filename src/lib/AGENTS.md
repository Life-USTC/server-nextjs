# src/lib/

Infrastructure and shared helpers.

## Directories

```
api/       Request/response, schemas, status
auth/      Session resolution, permissions
db/        Prisma instances
mcp/       MCP server (see mcp/AGENTS.md)
oauth/     OAuth provider, tokens
storage/   S3 client, signed URLs
security/  CSP, content security
time/      Date parsing, serialization
log/       Structured logging
```

## Key Imports

```typescript
// API
import { jsonResponse } from "@/lib/api/json-response";
import { handleRouteError } from "@/lib/api/error-handler";
import { buildPaginatedResponse } from "@/lib/api/pagination";

// Auth
import { requireSignedInUserId } from "@/lib/auth/require-signed-in-user-id";
import { resolveApiUserId } from "@/lib/auth/resolve-api-user-id";

// DB
import { prisma, getPrisma } from "@/lib/db/prisma";

// Time
import { parseDateInput } from "@/lib/time/parse-date-input";
import { getShanghaiDay } from "@/lib/time/shanghai-helpers";
```

## Rules

- No business logic (use `src/features/`)
- No direct Prisma imports
- Use shared helpers
- OAuth: never log tokens/secrets

See root `AGENTS.md` for patterns.
