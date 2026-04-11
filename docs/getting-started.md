# 本地开发入门

## 前置条件

- Node.js `>=22 <23`、Bun `1.3.x`、PostgreSQL 16
- 可选：Docker（快速启动 PostgreSQL）
- 可选：S3 兼容存储（不联调上传时设 `E2E_MOCK_S3=1`）

## 最短启动链路

```bash
cp .env.example .env          # 编辑 DATABASE_URL 等必要变量
bun install --frozen-lockfile
bun run hooks:install
docker compose -f docker-compose.dev.yml up -d postgres  # 或使用已有 PostgreSQL
bun run prisma:deploy
bun run dev:seed-scenarios
bun run dev                   # http://localhost:3000
```

启动后确认首页正常加载、`/api-docs` 可访问。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 开发服务器 |
| `bun run check --write` | Biome 格式化与检查 |
| `bun run build` | 生产构建 |
| `bun run test:e2e` | Playwright E2E |
| `bun run prebuild` | 重新生成 Prisma / OpenAPI 产物 |
| `bun run prisma:migrate` | 开发中创建新 migration |
| `bun run dev:seed-scenarios` | 注入本地场景数据 |
| `bun run dev:reset-scenarios` | 重置场景数据 |

**重要**：改了 Prisma schema、API 契约或生成产物后，需运行 `bun run prebuild` 并提交生成结果。

## 继续阅读

- [contributing.md](./contributing.md)：贡献流程
- [system-design.md](./system-design.md)：系统设计
