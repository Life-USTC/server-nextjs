# 工程实现

## 技术栈

Next.js 16 + React 19 / Bun / Prisma ORM / PostgreSQL 16 / Better Auth + OAuth / OIDC / Playwright E2E / Tailwind CSS + coss/base-ui

## 项目结构

| 目录 | 职责 |
| --- | --- |
| `src/app` | 页面路由、Route Handlers、`/api-docs` |
| `src/features` | 按用户任务组织的业务域（首页、作业、待办、评论、上传等） |
| `src/components` | 可复用 UI 组件 |
| `src/lib` | 基础设施（鉴权、数据库、MCP、日志、存储、安全） |
| `src/i18n` | 国际化配置与消息文件 |
| `prisma` | Schema 与 migrations |
| `tools` | seed、数据导入、OpenAPI 后处理等脚本 |
| `tests/e2e` | Playwright 端到端测试 |

各目录的 `AGENTS.md` 提供更具体的操作指引。

## 快速启动

```bash
cp .env.example .env          # 编辑 DATABASE_URL、AUTH_SECRET 等
bun install --frozen-lockfile
bun run hooks:install
docker compose -f docker-compose.dev.yml up -d postgres
bun run prisma:deploy
bun run dev:seed-scenarios
bun run dev                   # http://localhost:3000
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 开发服务器 |
| `bun run check --write` | Biome 格式化与检查 |
| `bun run build` | 生产构建 |
| `bun run test:e2e` | Playwright E2E |
| `bun run prebuild` | 重新生成 Prisma / OpenAPI 产物 |
| `bun run prisma:migrate` | 创建新 migration |
| `bun run dev:seed-scenarios` | 注入本地场景数据 |

## 工程规范

### 分层原则

系统分四层，改动前先判断落点：

1. **产品层**：用户真正关心的对象（班级、作业、考试、待办、评论、订阅）
2. **页面层**：把对象组织成稳定页面角色（首页判断面、详情页、列表页、管理页）
3. **服务层**：拼接数据、权限和协议（站内请求 / REST / OAuth / MCP）
4. **数据层**：Prisma schema 是约束，不是产品本身

### API 路由写法

- 所有 `/api/*` 使用 `dynamic = "force-dynamic"`
- 输入验证用 Zod schema（`src/lib/api/schemas`）
- 分页用 `buildPaginatedResponse()`（标准格式：`{ data, pagination: { page, pageSize, total, totalPages } }`）
- 错误用 `handleRouteError()`，自动日志 + 结构化响应
- 日期序列化用 `jsonResponse()`（自动 ISO 8601）

### 鉴权模式

- Server Components 用 `auth()` 获取 session
- API 路由用 `resolveApiUserId(request)`：先查 Bearer token（JWT/JWKS），再 fallback session cookie
- 页面保护用 `requireSignedInUserId()`
- 开发环境有 `dev-debug` 和 `dev-admin` 两个调试 provider

### 数据库

- 单例 Prisma 客户端 + locale 扩展（`namePrimary`/`nameSecondary` 按语言切换）
- 查询需要名称时必须用 `getPrisma(locale)`
- 连接池通过 `@prisma/adapter-pg` 管理

### 国际化

- 使用 `next-intl`，支持 `zh-cn`（默认）和 `en-us`
- 消息文件在 `messages/` 目录
- UI 中不允许硬编码字符串
- 检查覆盖：`bun run check:i18n`

### UI/UX 规范

界面设计为高密度、低干扰、可快速扫读的学习工作台：

- **信息优先**：优先支持扫描、比较、切换
- **轻量交互**：短操作就地完成（sheet），破坏性确认用 dialog
- **时间/状态前置**：时间、状态比说明文字更靠前
- **链接导航、按钮动作**：不混用

组件库参考：`docs/cossui/index.md`（基于 Base UI + Tailwind，copy-paste 模式）

### 安全

- CSP：nonce-based，`frame-ancestors: 'none'`
- HTTP 头：`X-Content-Type-Options: nosniff`、`X-Frame-Options: SAMEORIGIN`
- OAuth：PKCE 强制、JWT 通过 JWKS 验证、client secret SHA-256 哈希

### 日志

- 统一用 `logAppEvent(level, message, context)`
- 路由错误用 `logRouteFailure()`（4xx 仅 dev 记录，5xx 始终记录）
- 时间戳：上海时区

### 提交

- 使用 conventional commit（`feat(scope):`、`fix(scope):` 等）
- Git hooks 自动检查（`.githooks/pre-commit`、`.githooks/commit-msg`）
- 提交前：`bun run check --write && bun run build && bun run test:e2e`
- 改 schema/API 后提交 `bun run prebuild` 的生成产物

## 部署

- CI（push/PR）：Biome → prebuild → typecheck → E2E
- CD（main）：构建 Docker 镜像 → 推送 `ghcr.io`
- 生产部署：手动更新服务器 `jp-2` 上的 compose
- 线上：<https://life-ustc.tiankaima.dev>
