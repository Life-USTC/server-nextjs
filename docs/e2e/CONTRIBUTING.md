# E2E 贡献指南

这套测试不是通用 Playwright 沙盒，而是在真实 Next.js 应用、真实认证接线、seed 数据和路由级行为上运行的端到端测试。新增测试时，应保持同样的结构和约束，避免测试本身变成噪音。

## 目标

- 覆盖能证明功能成立的最短用户路径
- 优先验证稳定的产品行为，而不是实现细节
- 控制共享可变状态
- 让失败信息能直接指向产品回归，而不是测试框架噪音

## 文件布局

- 页面测试放在 `tests/e2e/src/app/**/test.ts`
- 尽量镜像 `src/app` 的路由结构
- API Route 测试放在 `tests/e2e/src/app/api/**/test.ts`
- 共享契约辅助在：
  - `tests/e2e/src/app/_shared/page-contract.ts`
  - `tests/e2e/src/app/_shared/api-contract.ts`
- 共享工具在：
  - `tests/e2e/utils/auth.ts`
  - `tests/e2e/utils/page-ready.ts`
  - `tests/e2e/utils/e2e-db.ts`
  - `tests/e2e/utils/dev-seed.ts`
  - `tests/e2e/utils/uploads.ts`

## 测试设计规则

1. 先补路由契约，再补具体行为测试
2. 一个测试只证明一个用户故事或一个 API 契约分支
3. 优先写短的 happy path，不要写“大杂烩”长流程
4. 只有在测试能自己清理时才增加破坏性流程
5. 如果某个功能有很多路由别名，优先复用辅助函数，不要在测试里硬编码 URL

较好的示例：

- 页面契约 + 有针对性的交互：`tests/e2e/src/app/dashboard/links/test.ts`
- 带 fixture setup 的 API 流程：`tests/e2e/src/app/api/comments/test.ts`
- 带状态恢复的 UI 流程：`tests/e2e/src/app/welcome/test.ts`

## 导航与页面就绪

- 页面跳转优先使用 `gotoAndWaitForReady(page, url)`
- 页面切换后如果还可能在 hydration，使用 `waitForUiSettled(page)`
- 不要随意用裸 `page.goto()` 替代这些辅助，除非该路由确实需要特殊等待逻辑
- 默认假设 `#main-content` 可见；如果该路由本来就会重定向或 404，请传 `expectMainContent: false`

## 认证

- 普通用户流程使用 `signInAsDebugUser(page, callbackPath?, expectedPath?)`
- 管理员流程使用 `signInAsDevAdmin(page, callbackPath?, expectedPath?)`
- 存在别名跳转时，使用 `expectPagePath()`
- 除非测试目标就是 `/signin` 本身，否则不要在测试里重复实现调试登录点击流程

## 数据与夹具

- 有稳定场景数据时，优先使用 `DEV_SEED`
- 需要额外准备或清理数据库状态时，使用 `tests/e2e/utils/e2e-db.ts`
- 夹具辅助应保持窄范围，只解决当前测试需要
- 测试自己创建的数据，自己负责清理
- 不要在 Playwright 测试中直接引入应用侧 Prisma 对象；数据库准备请走 `e2e-db.ts` 的子进程辅助

各数据来源的适用场景：

- `DEV_SEED`：稳定的只读断言
- `page.request`：通过公开 API 创建并验证应用可见记录
- `e2e-db.ts`：很难通过 UI 到达的准备/清理状态

## 选择器

- 优先语义化选择器：
  - `getByRole`
  - `getByLabel`
  - `getByPlaceholder`
  - `getByText`
- 当宽泛的 i18n 正则会命中多个控件时，使用更精确的文本或锚定正则
- 触发破坏性动作前，把选择器收窄到最近的有意义容器
- 只有语义选择器不稳定时才使用 `data-testid`

不推荐：

```ts
await page.locator("button").nth(3).click();
```

更好：

```ts
await page.getByRole("button", { name: /创建客户端|Create Client/i }).click();
```

如果有重复标签，最好先收窄到容器：

```ts
const row = page
  .getByText(clientName, { exact: true })
  .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
await row.getByRole("button", { name: /删除|Delete/i }).click();
```

## 断言

- 断言真正重要的行为：
  - 最终 URL
  - 可见状态
  - API 响应状态
  - 必要时的持久化结果
- 不要把页面上每个文本节点都断言一遍
- API 测试优先断言定义契约的字段，而不是无关 payload 形状
- 如果测试会改数据，用应用可见 API 或聚焦夹具辅助验证结果

## 防止 flaky

- 不要使用 `waitForTimeout()`，除非没有任何可观察信号，而且你在代码里说明了原因
- 优先使用：
  - `waitForResponse`
  - `toHaveURL`
  - `toBeVisible`
  - `toHaveAttribute`
  - `waitForLoadState("networkidle")`
- 如果必须轮询 eventual consistency，保持轮询局部且有上界
- 如果测试依赖会被修改的 seed 数据，要么恢复状态，要么把测试文件设成 serial

## 串行与并行

- 默认尽量保持并行安全
- 只有在测试明确会共享并修改同一批记录、而且逐条恢复成本过高时，才使用 `test.describe.configure({ mode: "serial" })`
- 如果测试自己创建唯一记录并清理，通常应该保持并行安全

## 截图

- 在真正有意义的节点使用 `captureStepScreenshot(page, testInfo, name)`
- 不要每点一步就截一次图
- 适合截图的时机：
  - 登录后落点
  - 对话框打开
  - 成功提交之后
  - 最终跳转完成之后

## 应覆盖什么

新增页面或功能时，建议按这个顺序补测试：

1. 路由契约存在，且不会 500
2. 如果是受保护路由，先测认证边界
3. 覆盖一条最短 happy path
4. 如果风险高，再补一条重要失败或拒绝分支
5. 如果创建了数据，明确写清理逻辑

如果一个功能同时有页面和 API，两侧通常都应该有测试。

## E2E 与更低层测试的分工

- 纯解析、格式化、schema、状态机逻辑放单测或更低层集成测试
- 只有当行为依赖路由、认证、浏览器 API、Server Action 或多层一起工作时，才优先写 E2E
- 如果不用浏览器也能证明行为成立，就把大部分覆盖放到低层测试，只保留一条最短 E2E 证明链路

## 更新覆盖度文档

- 如果你新增了有意义的路由或功能覆盖，同时更新：[`./COVERAGE.md`](./COVERAGE.md)
- 把它当作测试审计记录，而不是宣传材料
- 如果覆盖仍然不完整，就明确标记为部分覆盖

## Review 清单

合入前至少检查：

- 测试文件是否放在镜像路由的位置
- 是否复用了共享辅助，而不是复制登录/跳转代码
- 选择器是否语义化且有合理收窄
- 是否存在不必要的 `waitForTimeout()`
- 创建的数据是否都清理掉了
- 断言层级是否正确
- 如果功能覆盖变化了，`COVERAGE.md` 是否同步更新

## 常用命令

先跑聚焦文件或目录：

```bash
bun run test:e2e -- tests/e2e/src/app/api/todos
```

一次跑多个聚焦 spec：

```bash
bun run test:e2e -- tests/e2e/src/app/welcome/test.ts tests/e2e/src/app/admin/oauth/test.ts
```

大改前先跑 E2E 约定检查：

```bash
bun run check:e2e
```

不要在同一端口上并行启动多个 Playwright 进程指向同一个本地服务。
