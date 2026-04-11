# Life@USTC

Life@USTC 不是把教务系统原样搬到网页上，而是把课程、班级、作业、考试、待办和评论重新组织成一个帮助用户判断"接下来该做什么"的工作台。

这个仓库同时承载三类能力：

- 站内页面与交互
- 面向外部集成的 REST / OpenAPI
- 面向工具客户端的 MCP 与 OAuth / OIDC

## 技术栈

Next.js 16 + React 19 / Bun / Prisma ORM / PostgreSQL 16 / Better Auth + OAuth / OIDC / Playwright E2E

## 快速开始

```bash
bun install --frozen-lockfile
bun run prisma:deploy
bun run dev:seed-scenarios
bun run dev
```

详见 [docs/getting-started.md](./docs/getting-started.md)。

## 文档

- 产品目标与页面职责：[docs/product-goals.md](./docs/product-goals.md)
- 界面设计：[docs/design-principles.md](./docs/design-principles.md)
- 系统设计：[docs/system-design.md](./docs/system-design.md)
- 贡献流程：[docs/contributing.md](./docs/contributing.md)
- 部署：[docs/deployment.md](./docs/deployment.md)
- 文档总览：[docs/README.md](./docs/README.md)

## 仓库结构

- `src/app`：页面路由、Route Handlers
- `src/features`：面向用户任务的业务功能
- `src/components`：可复用 UI 组件
- `src/lib`：鉴权、数据库、MCP、日志等基础设施
- `prisma`：Schema 与 migrations
- `tools`：seed、导入、OpenAPI 等开发脚本
- `tests/e2e`：端到端测试

## CI / CD

- CI：检查、类型生成、类型检查、E2E
- CD：构建并推送镜像到 `ghcr.io`，生产环境需人工更新

详见 [docs/deployment.md](./docs/deployment.md)。
