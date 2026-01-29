# Prisma and Database Usage

## Why These Patterns
The database schema is the single source of truth for academic data. Prisma helpers provide consistent include graphs and paginated queries across the API.

## Schema Location
- Primary schema: `prisma/schema.prisma`.
- Regenerate the client after changes with `bun run prisma:generate`.

## Query Helpers
- Shared includes and paginated queries live in `src/lib/query-helpers.ts`.
- Use these helpers to keep response shapes consistent across endpoints.

## Type-Safe Includes
Use `satisfies` to preserve inference for include objects.

```typescript
const sectionInclude = {
  course: true,
  semester: true,
} satisfies Prisma.SectionInclude;

type SectionWithRelations = Prisma.SectionGetPayload<{
  include: typeof sectionInclude;
}>;
```

## Relationship Notes
- Schedule <-> Teachers is many-to-many, use `schedule.teachers` (array).
- Section has many-to-one links to Course, Semester, Campus, Department.
- Section <-> Teachers and Section <-> AdminClasses are many-to-many.

## Input Validation Before Queries
- Validate IDs and numeric inputs with `parseInt()` and `Number.isNaN()`.
- Use Zod for complex validation.
