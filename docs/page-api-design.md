# 页面与 API 设计提炼

## 适用范围
- 适用于 `src/app/**/page.tsx` 页面层与 `src/app/api/**/route.ts` 接口层。
- 适用于需要同时演进页面数据流、接口契约与测试覆盖的改动。

## 目标
- 降低页面与接口的样板代码比例，让业务意图更直观。
- 统一输入校验、错误语义、鉴权入口，减少实现分叉。
- 为后续功能迭代提供可持续扩展的约束层（Schema + OpenAPI + 测试）。

## 规则清单

### 页面层（App Router）

### 当前设计骨架
- 页面以 Server Component 为主，数据查询下沉到页面入口。
- 受保护页面普遍依赖 `auth() + redirect("/signin")`。
- Dashboard 相关页面存在较多“数据整形 + 展示混写”。

### 本轮优化
- 引入 `requireSignedInUserId()`，统一受保护页面登录态校验与跳转行为。
- 将“当前学期”推断逻辑抽离到 `src/lib/current-semester.ts`，消除页面间重复日期判断。
- 将 subscriptions 页面中高频格式化逻辑提到组件外复用，降低渲染函数复杂度。

### 后续建议
- 对超长页面继续执行“查询层 / 视图模型层 / 展示层”三段式拆分。
- 对跨页面重复的统计卡片、列表组装逻辑优先提取到 `app/**/components`。
- 对纯计算逻辑优先抽到 `lib/**` 并配套 Vitest 单测。

### API 层（Route Handlers）

### 当前设计骨架
- 路由统一在 `src/app/api/**/route.ts`。
- 统一错误出口 `handleRouteError()`，分页通过 `getPagination()`。
- 过去存在分散的 `parseInt`、参数校验与 include 片段复制。

### 本轮优化
- 统一整数解析到 `parseInteger/parseOptionalInt/parseIntegerList`。
- 参数无效统一可返回 `invalidParamResponse()`（400）。
- 抽出复用 include 片段 `sectionCompactInclude`，降低查询结构重复。
- 使用 Zod 校验 `POST /api/sections/match-codes` 请求体，提升边界输入安全性。

### 后续建议
- 对高风险写接口（评论、作业、描述）逐步改造成“先 schema parse，再业务执行”。
- 对鉴权/权限接口补充一致的错误码约定（401/403/404）。
- 对历史接口建立输入兼容策略（兼容字段与弃用字段标注）。

### OpenAPI 与契约治理

### 本轮落地
- 统一切换到 `next-openapi-gen` 生成 OpenAPI 文档（产物：`public/openapi.generated.json`）。
- 提供 `GET /api/openapi` 兼容入口，返回生成产物内容。
- 提供 `/api-docs` 交互式文档页面，便于联调与人工验收。

### 演进方向
- 新增接口时补充 JSDoc 的 `@response` / `@body` / `@params`，提升生成文档质量。
- 与 Zod Schema 同步维护输入/输出模型，减少定义漂移。
- 在 CI 中执行 `bun run openapi:generate` 并校验产物变更，确保契约更新可追踪。

### 测试策略提炼

### 本轮落地
- 保留 Playwright 端到端链路测试，并新增 API 路由边界测试。
- 新增 Vitest 作为业务与工具函数测试层，覆盖解析与学期推断边界。

### 建议分层
- `E2E`：关键页面链路、登录重定向、跨页面跳转。
- `API 集成`：参数异常、鉴权失败、核心成功路径。
- `业务单测`：纯函数规则与边界输入（日期、解析、筛选）。

## 示例
- 页面鉴权统一：受保护页面优先使用 `requireSignedInUserId()`，避免散落 `auth() + redirect()` 变体。
- API 输入统一：整数参数优先使用 `parseInteger()` 系列 helper，复杂输入先 `safeParse` 再执行业务。
- 契约同步：新增接口时同次补齐 OpenAPI 生成信息与对应 E2E/API 测试。

## 更新触发
- 新增页面、重构页面数据流或受保护页面鉴权逻辑变更。
- 新增/调整 Route Handler、输入校验、错误码语义。
- OpenAPI 产物、`/api/openapi` 或 `/api-docs` 行为变化。
- 测试分层策略或 E2E 覆盖边界发生变化。
