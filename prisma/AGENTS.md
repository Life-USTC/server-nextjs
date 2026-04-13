# prisma/

- Scope
  - Prisma schema, migrations and data model boundaries
  - `schema.prisma` is the source of truth for model details
  - Generated Prisma client output is `src/generated/prisma`
  - Import generated client from `@/generated/prisma/client`

- Datasource and generator
  - PostgreSQL connection comes from env
  - App code uses `@prisma/adapter-pg`
  - Prisma generator provider is `prisma-client`

- Model boundaries
  - JW/import facts include semester, course, section, teacher, schedule, exam and lookup data
  - User state includes section subscriptions, homework completions, todos, dashboard pins/clicks and bus preferences
  - Collaborative content includes homework, descriptions, comments, reactions and uploads
  - Auth/OAuth models are owned by Better Auth and the OAuth provider
  - Bus tables represent campuses, routes, ordered stops, schedule versions and trips

- Mutation constraints
  - Normal users do not edit JW/import facts
  - Subscription writes update only the current user relation
  - Homework completion writes must not mutate homework
  - Todo writes must stay scoped to owner
  - Comment, description and upload writes need target context
  - Admin/risky writes should preserve actor and time fields where the schema supports them
  - Soft-delete fields such as `deletedAt` must keep read paths and uniqueness assumptions in mind

- Schema change rules
  - Run `bun run prisma:migrate`
  - Run `bun run prebuild`
  - Add or update seed scenarios for new models or special logic
  - Update E2E tests when behavior changes
  - Check migrations for accidental destructive changes

- Naming
  - `id`: internal primary key
  - `jwId`: JW external key
  - `code`: imported or product code
  - `nameCn` / `nameEn`: bilingual names
  - `createdAt` / `updatedAt`: timestamps
  - `deletedAt`: soft delete marker
