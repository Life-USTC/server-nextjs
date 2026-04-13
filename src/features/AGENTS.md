# src/features/

- Scope
  - User-task business domains
  - Keep domain logic here, not in route handlers
  - Typical feature layout: `components/`, `server/`, `lib/`
  - Server Component data functions belong in `server/`
  - Client hooks stay under feature `hooks/` when scoped to one domain

- `home/`
  - Own dashboard panels and cards
  - Dashboard aggregation currently lives in `src/app/dashboard/dashboard-data.ts`
  - Move reusable dashboard behavior into `src/features/home/` only as an intentional refactor
  - Overview should answer what the user should do next
  - Prioritize current-semester work
  - Do not make stale semesters look current
  - Calendar week starts Sunday
  - Calendar events should link back to source objects

- `homeworks/`
  - Homework belongs to a section
  - Creation does not require subscribing to that section
  - Signed-in, unsuspended users can create/update active homework
  - Delete is creator/admin scoped
  - Completion belongs to the viewer, not the homework
  - Due-less homework stays visible but out of urgent due ordering
  - Description may be created/updated with homework
  - Preserve audit log writes for create/delete paths

- `todos/`
  - Todo belongs to one user
  - Users can create/edit/complete/delete only their own todos
  - Todo may have title, content, priority and due date
  - Incomplete due todos can appear on personal calendar
  - Completed todos should not remain urgent dashboard work

- `comments/`
  - Comments are object-scoped to section, course, teacher, section-teacher or homework
  - Support Markdown, math, emoji, tables, replies and reactions
  - Visibility supports public, logged-in only and anonymous
  - Anonymous hides identity from normal users; admin moderation can see enough context for safety work
  - Suspended users cannot create new comments
  - Authors can edit/delete their own comments
  - Admin can moderate/hide/delete

- `uploads/`
  - Uploads are comment attachments
  - Use pending-upload flow before attaching to comments
  - Enforce max file size and total quota
  - E2E can use mock S3
  - Download must check access to the owning comment/target context
  - Rename/delete only the owner upload unless admin flow explicitly exists

- `descriptions/`
  - Markdown supplement for section, course, teacher and homework
  - Platform-maintained info, distinct from comments
  - Track last editor and edit history
  - Description takes precedence over conflicting comment opinion

- `dashboard-links/`
  - Static link catalog plus user state
  - Search supports Chinese and pinyin
  - Public users can browse
  - Signed-in users can pin and record visits
  - Links navigate; buttons mutate pin/visit state

- `bus/`
  - Public timetable lookup
  - Signed-in preference save
  - Routes are ordered campus stop lists
  - Trips differ by weekday/weekend
  - Default day type should follow current date
  - Static import should be idempotent by schedule version/checksum

- Change rules
  - Add seed data for new models or special logic
  - Add or update E2E for changed user journeys
  - Preserve semester and section number in search, matching, cross-semester and admin views
  - Compact personal cards may prefer course name, time, place, teacher, state and next action
