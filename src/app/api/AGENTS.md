# src/app/api/

REST route handlers.

## Pattern

```typescript
import {
  handleRouteError,
  jsonResponse,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import { resolveApiUserId } from "@/lib/auth/helpers";

export async function GET(request: Request) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) return unauthorized();

    // Validate, fetch, return
    const data = await fetchData();
    return jsonResponse(data);
  } catch (error) {
    return handleRouteError("Failed to fetch data", error);
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

Run `bun run build:artifacts` after changes.

See root `AGENTS.md` for auth, dates, errors, validation.
