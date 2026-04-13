# src/

- Ownership
  - `app/`: App Router routes, layouts, route handlers, auth redirects and page composition
  - `features/`: user-task domains such as dashboard, homework, todo, comments, uploads, descriptions, links and bus
  - `components/`: reusable UI primitives and composed UI
  - `lib/`: infrastructure for API, auth, db, MCP, OAuth, storage, security, logging and time
  - `i18n/`: locale config and next-intl routing helpers
  - `shared/`: pure cross-feature utilities
  - `hooks/`: React hooks
  - `styles/`: global styles
  - `types/`: global TypeScript types
  - `generated/`: Prisma and OpenAPI generated code; do not edit manually

- Imports
  - Use `@/` aliases for app source imports
  - Import Prisma types from `@/generated/prisma/client`
  - Import app Prisma instances from `@/lib/db/prisma`
  - Import localized navigation from `@/i18n/routing`
  - Keep local relative imports for same-folder helpers when clearer

- React defaults
  - Server Components by default
  - Add `"use client"` only for hooks, browser APIs, event handlers or local client state
  - Fetch independent server data with `Promise.all()`
  - Keep client components small and interaction-focused

- Locale rules
  - Supported locales are `zh-cn` and `en-us`; default locale is `zh-cn`
  - URLs do not carry locale prefixes
  - Locale is negotiated by cookie and `Accept-Language`
  - User-facing text must be backed by both message files

- Time and security
  - Use Shanghai helpers for display and day boundaries
  - Use date serialization helpers before returning JSON
  - API/MCP datetime input should include offsets where schemas require it
  - Auth redirects for pages live close to page entry
  - API routes return status responses, not page redirects
  - Permission checks happen before mutation
  - Upload access cannot rely on object URL secrecy
