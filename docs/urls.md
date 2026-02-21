# URL List

## Static pages
- /
- /signin
- /dashboard
- /dashboard/comments
- /dashboard/homeworks
- /dashboard/subscriptions/sections
- /dashboard/uploads
- /sections
- /teachers
- /courses
- /comments/guide
- /settings
- /settings/profile
- /settings/uploads
- /settings/comments
- /settings/danger
- /settings/content
- /settings/accounts
- /admin
- /admin/users
- /admin/moderation

## Dynamic pages
- /sections/[jwId]
- /teachers/[id]
- /courses/[jwId]
- /comments/[id]
- /u/[username]
- /u/id/[uid]

## Redirect-only routes
- /settings -> /settings/profile
- /settings/uploads -> /dashboard/uploads
- /settings/comments -> /dashboard/comments
- /comments/[id] -> /sections/[jwId] or /courses/[jwId] or /teachers/[id]

## Documentation routes
- docs/README.md
- docs/cossui.md
- docs/cossui/*.md
- docs/page-api-design.md

## API utility routes
- /api/openapi
