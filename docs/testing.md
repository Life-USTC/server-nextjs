# 测试

## 测试策略

已接入 Playwright E2E 测试与 Vitest 单测。

- Playwright 采用“源码映射 + 场景补充”双层策略：
  - `tests/e2e/src/app/**/test.ts` 与 `src/app/**/page.tsx`、`src/app/api/**/route.ts` 按目录一一映射。
  - `tests/e2e/src/app/_shared/page-contract.ts` 与 `tests/e2e/src/app/_shared/api-contract.ts` 提供通用断言逻辑。
  - 其余场景测试继续覆盖创建/编辑、跳转链路、权限与国际化等高价值行为。
- Vitest 覆盖纯业务逻辑与工具函数（参数解析、当前学期推断、schema 校验）。

## 强制要求

- 所有页面都必须有对应 E2E 覆盖。
- 新增页面时，功能代码与 E2E 用例必须同次提交。
- 涉及创建/编辑/跳转/重定向行为的改动，必须补充对应 E2E。

## 单测运行

1. 执行一次性单测：`bun run test`
2. 监听模式：`bun run test:watch`

## E2E 运行

1. 首次安装浏览器：`bun run test:e2e:install`
2. 执行无头测试：`bun run test:e2e`
3. 执行有头模式：`bun run test:e2e:headed`
4. 打开交互式 UI：`bun run test:e2e:ui`
5. 查看 HTML 报告：`bun run test:e2e:report`

## 提交前验证

1. `bun run check --write`
2. `bun run build`
3. `bun run test:e2e`（至少覆盖本次改动涉及范围）

## 开发调试用户

- 运行 `bun run dev:seed-scenarios`（或兼容命令 `bun run dev:seed-debug-user`）可创建确定性调试场景数据：今天/明天有课、今日截止作业、评论线程、上传记录、已选课班级订阅。
- 运行 `bun run dev:reset-scenarios` 可只清理调试场景数据，不影响普通业务数据。
- 在开发环境打开 `/signin` 后，可点击“调试用户（开发）/Debug User (Dev)”按钮一键登录。
- 在开发环境打开 `/signin` 后，可点击“调试管理员（开发）/Admin User (Dev)”按钮一键登录管理员，用于覆盖后台与 admin API 的 E2E。
- 可通过环境变量覆盖调试用户信息：`DEV_DEBUG_USERNAME`、`DEV_DEBUG_NAME`。
  - 管理员调试账号可通过 `DEV_ADMIN_USERNAME`、`DEV_ADMIN_NAME` 覆盖。

## 当前用例

- `tests/e2e/src/app/**/test.ts`：与 `src/app/**/page.tsx`、`src/app/api/**/route.ts` 一一对应的映射测试，覆盖页面加载、关键交互（搜索、Tab 切换、跳转）、以及 API 响应契约。
- `tests/e2e/src/app/_shared/page-contract.ts`：公共页面契约断言（含 seed 数据可见性、动态路由、通用布局元素）。
- `tests/e2e/src/app/_shared/api-contract.ts`：公共 API 契约断言（含 seed 数据命中、关键状态码、OpenAPI/ICS/locale 等）。
- `tests/e2e/src/app/admin/**/test.ts`、`tests/e2e/src/app/dashboard/**/test.ts`、`tests/e2e/src/app/settings/**/test.ts`：在对应页面映射测试内断言未登录重定向到 `/signin`，并验证登录后功能行为。

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
