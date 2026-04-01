# Life@USTC

Life@USTC 不是把教务系统原样搬到网页上，而是把课程、班级、作业、考试、待办和评论重新组织成一个帮助用户判断“接下来该做什么”的工作台。

这个仓库同时承载三类能力：

- 站内页面与交互
- 面向外部集成的 REST / OpenAPI
- 面向工具客户端的 MCP 与 OAuth / OIDC

## 技术栈

- Next.js 16 + React 19
- Bun 1.3
- Prisma ORM
- PostgreSQL 16
- Better Auth + OAuth / OIDC
- Playwright E2E

## 快速开始

本仓库的操作细节（依赖、`.env`、数据库、seed、自检）统一维护在：

- [docs/getting-started.md](./docs/getting-started.md)

如果你已经有本地环境，最短启动链路通常是：

```bash
bun install --frozen-lockfile
bun run prisma:deploy
bun run dev:seed-scenarios
bun run dev
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 启动 Next.js 开发服务器 |
| `bun run check --write` | 运行并修复 Biome 检查 |
| `bun run build` | 生产构建 |
| `bun run test` | 运行单测 |
| `bun run test:e2e` | 运行 Playwright E2E |
| `bun run check:e2e` | 检查 E2E 约定 |
| `bun run prebuild` | 生成 Prisma/OpenAPI 产物 |
| `bun run prisma:deploy` | 应用已有 Prisma migration |
| `bun run prisma:migrate` | 在开发中创建并应用新 migration |
| `bun run dev:seed-scenarios` | 注入本地开发种子数据 |

## 文档导航

先读入口，再按任务深挖：

- 开始本地开发：[docs/getting-started.md](./docs/getting-started.md)
- 参与开发与提交：[docs/contributing.md](./docs/contributing.md)
- 部署与发布：[docs/deployment.md](./docs/deployment.md)
- 文档总览：[docs/README.md](./docs/README.md)

如果你更关心系统设计而不是操作手册：

- 产品目标：[docs/product-goals.md](./docs/product-goals.md)
- 界面设计：[docs/design-principles.md](./docs/design-principles.md)
- 系统设计：[docs/system-design.md](./docs/system-design.md)
- API 与 MCP：[docs/api-and-mcp.md](./docs/api-and-mcp.md)
- 开发规则：[docs/development-rules.md](./docs/development-rules.md)

更细的专项资料：

- E2E 贡献指南：[docs/e2e/CONTRIBUTING.md](./docs/e2e/CONTRIBUTING.md)
- E2E 覆盖审计：[docs/e2e/COVERAGE.md](./docs/e2e/COVERAGE.md)
- UI 组件文档：[docs/cossui/index.md](./docs/cossui/index.md)
- 变更记录：[CHANGELOG.md](./CHANGELOG.md)

## 仓库结构

高频目录可以先这样理解：

- `src/app`：页面路由、Route Handlers、`/api-docs`
- `src/features`：面向用户任务的业务功能
- `src/components`：可复用 UI 组件
- `src/lib`：鉴权、数据库、MCP、日志、存储等基础设施
- `prisma`：Schema 与 migrations
- `tools`：OpenAPI、seed、数据导入等开发脚本
- `tests/e2e`：端到端测试

## CI / CD 概览

- CI 会执行检查、类型生成、类型检查和 E2E
- CD 会在 `main` 上按需执行 `prisma:deploy`，构建并推送镜像到 `ghcr.io`
- 生产环境不会自动更新部署，仍需人工在服务器上更新 compose / 镜像

部署细节见 [docs/deployment.md](./docs/deployment.md)。
