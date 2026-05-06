# src/app/api/

REST route handlers.

## Pattern

```typescript
import { jsonResponse } from "@/lib/api/json-response";
import { handleRouteError } from "@/lib/api/error-handler";
import { unauthorized, notFound } from "@/lib/api/status-responses";
import { resolveApiUserId } from "@/lib/auth/resolve-api-user-id";

export async function GET(request: Request) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) return unauthorized();

    // Validate, fetch, return
    const data = await fetchData();
    return jsonResponse(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
```

## Key Rules

- Return status responses, not redirects
- Use `jsonResponse()` for date serialization
- Validate with Zod schemas
- Check auth before mutations
- Use `buildPaginatedResponse()` for lists

## OpenAPI

```typescript
/**
 * @params { page?: number }
 * @pathParams { id: string }
 * @body CreateBody
 * @response { id: string }
 */
export async function POST(request: Request) {}
```

Run `bun run prebuild` after changes.

See root `AGENTS.md` for auth, dates, errors, validation.
