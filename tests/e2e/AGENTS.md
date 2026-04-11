# tests/e2e/

Playwright 端到端测试，在真实 Next.js 应用上运行。

## 结构

- `src/app/**/`: 按路由镜像的测试文件（`test.ts`）
- `src/app/_shared/`: 共享契约辅助（`page-contract.ts`、`api-contract.ts`）
- `utils/`: 测试工具
  - `auth.ts`: `signInAsDebugUser()`、`signInAsDevAdmin()`
  - `page-ready.ts`: `gotoAndWaitForReady()`、`waitForUiSettled()`
  - `e2e-db.ts`: 数据库准备和清理
  - `dev-seed.ts`: seed 数据常量

## 测试设计

- 先补路由契约（能访问、不 500），再补具体行为
- 一个测试只证明一个用户故事
- 优先短 happy path，避免大杂烩长流程
- 测试创建的数据必须自己清理

## 数据来源

- `DEV_SEED`: 稳定只读断言
- `page.request`: 通过 API 创建并验证
- `e2e-db.ts`: 难以通过 UI 到达的准备/清理

## 选择器

优先语义化：`getByRole` > `getByLabel` > `getByText` > `data-testid`

## 防 flaky

- 不用 `waitForTimeout()`
- 用 `waitForResponse`、`toHaveURL`、`toBeVisible`

## 覆盖度

当前状态见 `docs/e2e/COVERAGE.md`。新增功能覆盖后同步更新。

## 命令

- `bun run test:e2e`: 运行全部
- `bun run test:e2e -- tests/e2e/src/app/api/todos`: 聚焦运行
- `bun run check:e2e`: 检查约定
