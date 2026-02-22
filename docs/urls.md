# 路由清单

## 维护规则
- 新增/删除页面或重定向时，必须同步更新本文件。
- 本清单仅记录应用可访问页面与文档入口，不记录 `src/app/api/**` 下的全部 API 路由。

## 静态页面
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
- /api-docs
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

## 动态页面
- /sections/[jwId]
- /teachers/[id]
- /courses/[jwId]
- /comments/[id]
- /u/[username]
- /u/id/[uid]

## 仅重定向路由
- /settings -> /settings/profile
- /settings/uploads -> /dashboard/uploads
- /settings/comments -> /dashboard/comments
- /comments/[id] -> /sections/[jwId] or /courses/[jwId] or /teachers/[id]

## 文档路由
- docs/README.md
- docs/documentation-guidelines.md
- docs/cossui.md
- docs/cossui/*.md
- docs/page-api-design.md

## API 工具路由
- /api/openapi
- /openapi.generated.json
