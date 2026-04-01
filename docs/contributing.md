# 贡献指南

这份文档关注“怎么在这个仓库里安全地改东西并交付”，而不是解释产品理念。

## 基本工作方式

- 统一使用 `bun` / `bunx`
- 提交前先跑检查、构建和 E2E
- 只提交与你当前任务直接相关的改动
- 优先复用现有设计语言、页面职责和系统边界

## 初次进入仓库

安装依赖并启用 git hooks：

```bash
bun install --frozen-lockfile
bun run hooks:install
```

仓库已启用：

- `.githooks/pre-commit`
- `.githooks/commit-msg`

## 提交前必跑

```bash
bun run check --write
bun run build
bun run test:e2e
```

如果你改动了 Prisma schema、OpenAPI 或依赖生成产物的逻辑，再补：

```bash
bun run prebuild
```

如果你改的是测试本身，也建议补跑：

```bash
bun run check:e2e
```

## Commit 约定

- 使用 conventional commit，例如 `feat: ...`、`fix: ...`、`chore: ...`
- 一次 commit 只包含一组直接相关的改动
- 如果 pre-commit hook 自动改了文件，提交前再次确认这些文件是否已经被纳入 commit

## 改功能时的最低要求

### 改数据模型或特殊逻辑

记得同时补：

- 对应 seed 数据
- 相关 E2E
- 必要的生成产物（例如 Prisma / OpenAPI）

### 改页面或交互

持续检查：

- 是否遗漏国际化
- 是否破坏首页“判断面”的定位
- 是否引入新的鉴权边界、协议边界或对象边界

### 改 API / MCP

同时检查：

- `/api-docs` 是否仍可工作
- `public/openapi.generated.json` / `src/generated/openapi.ts` 是否需要更新
- `src/lib/mcp` 与 `src/app/api` 的边界是否仍清晰

## 测试分工

- `bun run test`：更适合纯逻辑、格式化、schema、状态机等低层验证
- `bun run test:e2e`：覆盖真实 Next.js 应用、鉴权、页面/路由/API 联动
- `bun run check:e2e`：约束 E2E 文件布局和写法

E2E 的详细规范见：

- [./e2e/CONTRIBUTING.md](./e2e/CONTRIBUTING.md)
- [./e2e/COVERAGE.md](./e2e/COVERAGE.md)

## 代码定位建议

- `src/app`：页面、路由、Route Handlers
- `src/features`：用户任务域逻辑
- `src/components`：复用 UI
- `src/lib`：数据库、鉴权、MCP、日志、存储等基础设施
- `prisma`：Schema 和 migrations
- `tools`：seed、导入、OpenAPI 处理等脚本

## 发布前的自检

确认这些问题都能回答“是”：

1. 我只提交了与当前任务相关的改动
2. 所有检查、构建、E2E 都通过了
3. 如果改了 schema / 协议 / 页面，我已经补齐对应 seed、生成产物和测试
4. 如果改了文案或页面，我已经检查过 i18n

## 相关文档

- 本地开发：[getting-started.md](./getting-started.md)
- 部署流程：[deployment.md](./deployment.md)
- 开发规则：[development-rules.md](./development-rules.md)
