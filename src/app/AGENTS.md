# src/app/

Next.js App Router 页面和 API 路由。

## 页面

- `page.tsx`: 首页，登录后显示 tabbed dashboard，未登录显示公开页
- `sections/`: 班级列表和详情页（核心工作单元）
- `courses/`: 课程浏览和详情
- `teachers/`: 教师浏览和详情
- `settings/`: 用户设置（profile/accounts/content/danger）
- `admin/`: 管理后台（moderation/users/oauth），需要 isAdmin
- `welcome/`: 新用户资料完善
- `signin/`: 登录页
- `oauth/authorize`: 第三方 OAuth 同意页

## API

- `api/`: REST Route Handlers（详见 /api-docs）
- 每个路由文件必须 `export const dynamic = "force-dynamic"`
- 输入验证用 Zod schema，错误处理用 `handleRouteError()`
- 分页用 `buildPaginatedResponse()`

## 约定

- 页面用 `generateMetadata()` 设置标题（通过 i18n）
- 数据并行获取用 `Promise.all()`
- 鉴权检查放在页面最前面
- 新增页面必须检查 i18n 覆盖
