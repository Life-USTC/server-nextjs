# Folder Structure

This project uses a feature-oriented structure while keeping Next.js route files in `src/app`.

## Top-level source layout

- `src/app`: Next.js App Router routes, layouts, and route handlers.
- `src/components/ui`: shared presentational UI primitives.
- `src/features`: feature modules (UI, hooks, server helpers, and feature-local libs).
- `src/shared/lib`: shared pure utilities used across multiple domains.
- `src/hooks`: shared cross-feature hooks.
- `src/lib`: shared cross-feature infrastructure code.
- `src/i18n`: internationalization routing and request helpers.
- `src/styles`: shared global style tokens and utilities.
- `src/types`: shared ambient and library type declarations.

## Feature module conventions

Each feature may contain one or more of these folders:

- `components`: feature UI components.
- `hooks`: feature-specific hooks.
- `server`: feature-specific server-side helpers.
- `lib`: feature-specific non-UI utilities.

Current examples:

- `src/features/home/components/*`
- `src/features/homeworks/components/*`
- `src/features/dashboard-links/{components,lib}/*`

Example:

- `src/features/comments/components/*`
- `src/features/comments/hooks/*`
- `src/features/comments/server/*`

## Shared vs feature code

Put code in `src/features/*` when it is primarily used by one domain.
Put reusable pure utilities in `src/shared/lib`.
Put infrastructure and framework-coupled cross-feature code in `src/lib` and shared hooks in `src/hooks`.

## Infrastructure layout

- `src/lib/api`: API client, helpers, and shared request/response schemas.
- `src/lib/auth`: shared auth guard/utility helpers.
- `src/lib/db`: Prisma client bootstrap and db-related shared helpers.
- `src/lib/storage`: storage and S3 integration helpers.

## Generated and local artifacts

- Generated code: `src/generated` (ignored by git).
- Build and test artifacts: `.next`, `playwright-report`, `test-results` (ignored by git).
- Local environment files: `.env*` (ignored by git).
