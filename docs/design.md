# Design

## Page Link Graph

This graph captures the current page-to-page navigation and redirect behavior in the app router.

```mermaid
flowchart TD
  subgraph Core["Core browsing"]
    Home["/ (home: landing + dashboard tabs)"]
    Tabs["/?tab={overview|calendar|homeworks|todos|exams|subscriptions|links}"]
    Sections["/sections"]
    SectionDetail["/sections/:jwId"]
    Teachers["/teachers"]
    TeacherDetail["/teachers/:id"]
    Courses["/courses"]
    CourseDetail["/courses/:jwId"]
  end

  subgraph AuthOnboarding["Auth and onboarding"]
    Signin["/signin"]
    Welcome["/welcome"]
    OAuthAuthorize["/oauth/authorize"]
    IncompleteProfile["Any signed-in route with incomplete profile"]
  end

  subgraph SettingsProfile["Settings and profile"]
    SettingsRoot["/settings (redirect)"]
    SettingsProfilePage["/settings/profile"]
    SettingsAccounts["/settings/accounts"]
    SettingsContent["/settings/content"]
    SettingsDanger["/settings/danger"]
    SettingsUploads["/settings/uploads (redirect)"]
    SettingsComments["/settings/comments (redirect)"]
    UserProfile["/u/:username"]
    UserProfileById["/u/id/:uid"]
  end

  subgraph CommentsDocs["Comment/doc utility routes"]
    CommentJump["/comments/:id (redirect resolver)"]
    CommentsGuide["/comments/guide"]
  end

  subgraph Admin["Admin"]
    AdminHome["/admin"]
    AdminModeration["/admin/moderation"]
    AdminUsers["/admin/users"]
    AdminOAuth["/admin/oauth"]
  end

  ApiDocs["/api-docs"]

  Home --> Tabs
  Home --> Sections
  Home --> Teachers
  Home --> Courses
  Home --> SettingsProfilePage
  Home --> UserProfile
  Home --> UserProfileById

  Sections --> SectionDetail
  SectionDetail --> Sections
  SectionDetail --> TeacherDetail
  SectionDetail --> CourseDetail
  SectionDetail --> Tabs
  SectionDetail --> Signin

  Teachers --> TeacherDetail
  TeacherDetail --> Teachers
  TeacherDetail --> SectionDetail

  Courses --> CourseDetail
  CourseDetail --> Courses
  CourseDetail --> SectionDetail

  SettingsRoot --> SettingsProfilePage
  SettingsProfilePage --> SettingsAccounts
  SettingsProfilePage --> SettingsContent
  SettingsProfilePage --> SettingsDanger
  SettingsAccounts --> SettingsProfilePage
  SettingsContent --> SettingsProfilePage
  SettingsDanger --> SettingsProfilePage
  SettingsContent --> Home
  SettingsUploads --> Home
  SettingsComments --> Home
  SettingsDanger --> Home

  OAuthAuthorize -. unauthenticated .-> Signin
  Signin -. callbackUrl .-> OAuthAuthorize
  Signin --> Home
  IncompleteProfile -. middleware redirect .-> Welcome
  Welcome --> Home
  Welcome --> Signin

  CommentJump --> SectionDetail
  CommentJump --> CourseDetail
  CommentJump --> TeacherDetail
  SectionDetail --> CommentsGuide
  CourseDetail --> CommentsGuide
  TeacherDetail --> CommentsGuide
  Tabs --> CommentsGuide

  AdminHome --> AdminModeration
  AdminHome --> AdminUsers
  AdminHome --> AdminOAuth
  AdminModeration --> AdminHome
  AdminUsers --> AdminHome
  AdminOAuth --> AdminHome
  AdminModeration --> CommentJump
  AdminModeration --> SectionDetail
  AdminModeration --> CourseDetail
  AdminModeration --> TeacherDetail

```

- `/` is the main hub: it links to discovery pages (`/sections`, `/teachers`, `/courses`), tabbed dashboard states (`/?tab=...`), settings, and profile pages via global navigation.
- `/comments/:id` is a resolver route; it does not render content itself and redirects to the related section/course/teacher anchor.
- Middleware forces signed-in users with incomplete profiles to `/welcome` before they can use normal pages.
- Settings pages are connected by a shared sidebar (`/settings/profile`, `/settings/accounts`, `/settings/content`, `/settings/danger`), while `/settings` is an index redirect.

## Proposed Layout (Unified Tabs)

This proposal keeps current feature coverage but simplifies navigation into two consistent tab shells: home tabs and settings tabs.

### Core Navigation

```mermaid
flowchart TD
  subgraph AppShells
    direction LR
    Home["/"]
    HomeTabs["/?tab=*"]
    SettingsTabs["/settings?tab=*"]
    Home --> HomeTabs
    Home --> SettingsTabs
  end

  subgraph EntityGroups
    direction LR

    subgraph SectionsGroup
      direction TB
      Sections["/sections"]
      SectionDetail["/sections/:jwId"]
      Sections --> SectionDetail
    end

    subgraph TeachersGroup
      direction TB
      Teachers["/teachers"]
      TeacherDetail["/teachers/:id"]
      Teachers --> TeacherDetail
    end

    subgraph CoursesGroup
      direction TB
      Courses["/courses"]
      CourseDetail["/courses/:jwId"]
      Courses --> CourseDetail
    end
  end

  subgraph CommentsGroup
    direction TB
    CommentJump["/comments/:id"]
  end

  subgraph GuidesGroup
    direction TB
    MarkdownGuide["/guides/markdown-support"]
  end

  Home --> Sections
  Home --> Teachers
  Home --> Courses

  SectionDetail --> TeacherDetail
  SectionDetail --> CourseDetail

  SectionDetail --> MarkdownGuide
  TeacherDetail --> MarkdownGuide
  CourseDetail --> MarkdownGuide

  CommentJump --> SectionDetail
  CommentJump --> TeacherDetail
  CommentJump --> CourseDetail
```

### Access And Admin Flows

```mermaid
flowchart LR
  subgraph Access
    direction TB
    Signin["/signin"]
    OAuthAuthorize["/oauth/authorize"]
    Welcome["/welcome"]
  end

  subgraph Admin
    direction TB
    AdminHome["/admin"]
    AdminModeration["/admin/moderation"]
    AdminUsers["/admin/users"]
    AdminOAuth["/admin/oauth"]
    AdminHome --> AdminModeration
    AdminHome --> AdminUsers
    AdminHome --> AdminOAuth
  end

  OAuthAuthorize -. unauthenticated .-> Signin
  Signin -. callbackUrl .-> OAuthAuthorize
  Welcome --> Home["/"]

  AdminModeration --> CommentJump["/comments/:id"]
```

| Current route | Proposed canonical route |
| --- | --- |
| `/settings/profile` | `/settings?tab=profile` |
| `/settings/accounts` | `/settings?tab=accounts` |
| `/settings/content` | `/settings?tab=content` |
| `/settings/danger` | `/settings?tab=danger` |
| `/comments/guide/` | `/guides/markdown-support/` |

- Unify settings UX with the same tab mental model already used by home dashboard tabs.
- Keep one canonical URL per view, and make menu/sidebar actions point only to canonical routes.
- Move markdown syntax docs out of comments namespace (`/comments/guide/`) into guides namespace (`/guides/markdown-support/`).

## Design System & UI Primitives

The app uses a small, cohesive design system built on:

- **Tokens**: low-level and semantic variables in
  - `src/styles/tokens.css` – brand palette (OKLCH), spacing, radius, typography and layout widths.
  - `src/app/globals.css` – app-shell theme variables (`--background`, `--foreground`, `--card`, `--primary`, etc.) and Tailwind color bridge via `@theme inline`.
  - `tailwind.config.ts` – border radius and shadow utilities mapped to token variables for consistency between CSS and Tailwind classes.
- **UI primitives (`src/components/ui`)**:
  - **Form controls**: `Input`, `Textarea`, `Select`, `NumberField` share a unified `ControlSize` (`"sm" | "default" | "lg"`) type from `src/components/ui/types.ts` and consistent container styling (border, radius, focus ring, invalid/disabled states).
  - **Surfaces**: `Card` and its slots (`CardHeader`, `CardTitle`, `CardDescription`, `CardPanel`, `CardFooter`, `CardAction`) define the standard panel appearance used across dashboard and settings.
  - **Feedback & structure**: `Empty*` components (`Empty`, `EmptyHeader`, `EmptyTitle`, etc.) provide a consistent empty-state pattern, and components like `Badge`, `Alert`, `Toast`, `Spinner` reuse the shared color and radius tokens.
  - **Buttons**: `Button` + `buttonVariants` (via `class-variance-authority`) define size and variant combinations; unit tests in `tests/unit/ui-button.test.ts` ensure variants map to the expected semantic classes.

### Page-Level Layout Components

Page layout is standardized via `src/components/page-layout.tsx`:

- **`PageLayout`**: wraps a page’s main content with:
  - `breadcrumbs` – optional React node rendered above the header (typically a `<Breadcrumb>`).
  - `title` / `description` – displayed using the typography scale (`text-title`, `text-title-2`, etc.).
  - `children` – arbitrary page content, usually a grid of `Card`/`PageSection` components.
- **`PageSection` / `Panel`**: card-like section container that composes:
  - `title`, `description`, `actions` into a `CardHeader` with optional `CardAction`.
  - `children` into `CardPanel`.
  - optional `footer` into `CardFooter`.

The settings layout has been migrated to this API:

- `src/app/settings/layout.tsx` now uses `PageLayout` with:
  - `breadcrumbs` wired to the `Breadcrumb` UI component.
  - `title`/`description` sourced from `next-intl` translations.
  - main content as a two-column grid: sticky `SettingsNav` sidebar + section content.

### Testing And Guardrails

- **Unit tests**:
  - `tests/unit/ui-button.test.ts` asserts `buttonVariants` produce the correct semantic classes for common variants and sizes, protecting against accidental changes to the button API.
  - `tests/unit/page-layout.test.tsx` uses `renderToStaticMarkup` to verify that `PageLayout` correctly renders breadcrumbs, header (title + description), and children.
- **E2E tests**:
  - Existing Playwright suites under `tests/e2e/src/app/**` validate that navigation and key pages (home, settings, uploads, comments, etc.) continue to behave and render correctly after design-system changes.

When adding new UI or pages, prefer:

- Consuming existing primitives from `src/components/ui` instead of writing ad-hoc Tailwind class strings.
- Using `PageLayout` and `PageSection`/`Panel` for page shells and panels, so that typography, spacing, and borders stay consistent without re-implementing layout patterns.
