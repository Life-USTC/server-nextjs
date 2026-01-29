# API Patterns

## Why These Patterns
Consistent route structure and error handling make the API predictable and safe. Shared helpers keep pagination, filtering, and error responses uniform.

## Route Structure
- API routes live in `src/app/api/**/route.ts`.
- Use REST-style resources and nested routes for associations.
- Prefer query params for filtering and pagination.

## Standard Route Skeleton
Use the shared helpers in `src/lib/api-helpers.ts` and query helpers from `src/lib/query-helpers.ts`.

```typescript
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
import { paginatedSectionQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);
  const where: Prisma.SectionWhereInput = {};

  try {
    const result = await paginatedSectionQuery(pagination.page, where);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("Failed to fetch sections", error);
  }
}
```

## Pagination
- Use `getPagination(searchParams)` to parse inputs.
- Return `buildPaginatedResponse()` from query helpers to keep response shape consistent.

## Error Handling
- Wrap handlers in `try/catch`.
- Always return `handleRouteError("message", error)` for consistent JSON errors.

## Input Validation
- Validate all inputs before Prisma queries.
- For numeric inputs, use `parseInt()` + `Number.isNaN()`.
- Use Zod for complex validation.
