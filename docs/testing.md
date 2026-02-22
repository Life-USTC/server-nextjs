# 测试

## 当前状态
已接入 Playwright E2E 测试与 Vitest 单测。
- Playwright 覆盖公开页面、受保护页面、动态路由、页面跳转链路与部分 API 边界。
- Vitest 覆盖纯业务逻辑与工具函数（参数解析、当前学期推断、schema 校验）。

## 单测运行
1. 执行一次性单测：`bun run test`
2. 监听模式：`bun run test:watch`

## E2E 运行
1. 首次安装浏览器：`bun run test:e2e:install`
2. 执行无头测试：`bun run test:e2e`
3. 执行有头模式：`bun run test:e2e:headed`
4. 打开交互式 UI：`bun run test:e2e:ui`
5. 查看 HTML 报告：`bun run test:e2e:report`

## 开发调试用户
- 运行 `bun run dev:seed-scenarios`（或兼容命令 `bun run dev:seed-debug-user`）可创建确定性调试场景数据：今天/明天有课、今日截止作业、评论线程、上传记录、已选课班级订阅。
- 运行 `bun run dev:reset-scenarios` 可只清理调试场景数据，不影响普通业务数据。
- 在开发环境打开 `/signin` 后，可点击“调试用户（开发）/Debug User (Dev)”按钮一键登录。
- 可通过环境变量覆盖调试用户信息：`DEV_DEBUG_USERNAME`、`DEV_DEBUG_NAME`。

## 当前用例
- `tests/e2e/smoke.spec.ts`：验证首页加载与 `/sections`、`/teachers`、`/dashboard` 入口可见。
- `tests/e2e/smoke.spec.ts`：验证 `/signin` 页面可访问且 USTC/GitHub/Google 登录按钮可见。
- `tests/e2e/public-pages.spec.ts`：验证 `/sections`、`/teachers`、`/courses` 页面加载、搜索参数生效，以及列表区（表格或空态）渲染。
- `tests/e2e/public-pages.spec.ts`：验证 `/comments/guide` 页面可访问并成功渲染 Markdown 示例。
- `tests/e2e/public-pages.spec.ts`：验证 `/api-docs` 页面可访问并展示 Swagger UI 容器。
- `tests/e2e/detail-navigation.spec.ts`：验证列表页可进入详情页；若当前数据为空则回退验证详情页 404 行为。
- `tests/e2e/auth-redirect.spec.ts`：验证未登录访问 `/admin*`、`/dashboard*`、`/settings*` 全部受保护页面时会重定向到 `/signin`。
- `tests/e2e/dynamic-routes.spec.ts`：验证 `/comments/[id]`、`/u/[username]`、`/u/id/[uid]` 及详情页动态路由在无效参数下返回 404。
- `tests/e2e/navigation-flow.spec.ts`：验证首页快速入口跳转与列表页面包屑返回首页等跨页面导航逻辑。
- `tests/e2e/api-routes.spec.ts`：验证 OpenAPI 接口、match-codes 输入边界与 calendar 参数非法场景。
- `tests/e2e/api-routes.spec.ts`：覆盖主要 API 路由在未授权/异常输入下不返回 500，并校验预期状态码集合。
- `tests/e2e/api-routes.spec.ts`：覆盖启用 query schema 的接口在非法查询参数下返回 400。

## 当前单测
- `tests/unit/api-helpers.test.ts`：整数解析与列表解析边界。
- `tests/unit/current-semester.test.ts`：当前学期推断策略与回退逻辑。
- `tests/unit/api-schemas.test.ts`：match-codes 请求体 schema 校验边界。
- `tests/unit/sections-page-helpers.test.ts`：订阅页分组与学期统计逻辑。

## 配置说明
- Playwright 配置文件：`playwright.config.ts`
- 默认通过 `bun run dev -- --port 3000` 启动被测服务。
- 可通过 `PLAYWRIGHT_PORT` 指定端口；可通过 `PLAYWRIGHT_REUSE_SERVER=1` 复用已运行服务。
- `CI` 环境下自动启用重试并限制 worker 数。
