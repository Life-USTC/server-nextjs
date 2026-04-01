# 本地开发入门

这份文档面向第一次在本仓库上开发的人，目标是把“从零到能跑起来”的路径写成一条最短可执行链路。

## 前置条件

- Node.js `>=22 <23`
- Bun `1.3.x`
- PostgreSQL 16
- 可选：Docker，用来快速启动本地 PostgreSQL
- 可选：S3 兼容存储；如果只做本地调试或 E2E，可以改用 `E2E_MOCK_S3=1`

## 1. 安装依赖

```bash
bun install --frozen-lockfile
bun run hooks:install
```

项目统一使用 `bun` / `bunx`。不要在日常开发里切回 `npm` / `pnpm`。

## 2. 准备环境变量

复制模板：

```bash
cp .env.example .env
```

本地开发最常见的两种配置方式：

### 方式 A：使用真实 PostgreSQL + mock S3

最省事，适合页面/API 联调：

```dotenv
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/life_ustc_dev"
BETTER_AUTH_URL="http://localhost:3000"
AUTH_SECRET="replace-with-random-secret"
JWT_SECRET="replace-with-random-secret"
WEBHOOK_SECRET="replace-with-random-secret"
E2E_MOCK_S3="1"
```

### 方式 B：使用真实 PostgreSQL + 真实 S3/MinIO

当你要联调上传链路时，再配置这些变量：

- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `R2_ACCESS_URL`
- `S3_REGION`

OAuth / OIDC 提供方变量按需填写；本地不接真实第三方登录时可以先留空。

## 3. 启动 PostgreSQL

如果本机没有常驻 PostgreSQL，可直接使用仓库自带 compose：

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

它会启动：

- PostgreSQL 16
- 默认数据库 `life_ustc_dev`
- 默认账号 `postgres` / `postgres`

## 4. 应用数据库迁移

```bash
bun run prisma:deploy
```

在这个仓库里：

- `bun run prisma:deploy`：用于应用已有 migration，适合本地初始化、CI 和部署
- `bun run prisma:migrate`：用于你自己正在开发新的 schema 变更时创建 migration

如果你只是把仓库拉下来跑起来，优先用 `prisma:deploy`。

## 5. 注入本地开发场景数据

```bash
bun run dev:seed-scenarios
```

这一步会准备稳定的本地开发场景，供页面浏览、E2E 和调试使用。

如果你需要重置再来一遍：

```bash
bun run dev:reset-scenarios
bun run dev:seed-scenarios
```

## 6. 启动应用

```bash
bun run dev
```

默认访问地址：

- 应用首页：<http://localhost:3000>
- OpenAPI / Swagger：<http://localhost:3000/api-docs>
- 生成后的 OpenAPI 文件：<http://localhost:3000/openapi.generated.json>

## 7. 首次启动后的最小自检

至少确认以下事项：

1. 首页能正常加载，没有数据库连接错误
2. `/api-docs` 能正常显示 Swagger UI
3. 能浏览课程、教师、班级等 seed 数据页面
4. 如果启用了 `E2E_MOCK_S3=1`，上传相关开发流程不再要求真实 S3

## 日常开发命令

```bash
bun run check --write
bun run build
bun run test
bun run test:e2e
```

如果你改了 Prisma schema、OpenAPI 或依赖这些生成物的代码，记得运行：

```bash
bun run prebuild
```

它会完成：

- Prisma client 生成
- OpenAPI 生成
- OpenAPI TypeScript 类型生成

## 常见场景

### 新增 Prisma schema 或 migration

```bash
bun run prisma:migrate
bun run prebuild
```

同时补齐：

- 对应 seed 数据
- 相关 E2E 或单测

### 只想刷新本地场景数据

```bash
bun run dev:seed-scenarios
```

### 只想查看数据库

```bash
bun run prisma:studio
```

## 常见问题

### 启动时报存储相关变量缺失

如果你当前不联调真实上传，把 `.env` 里的 `E2E_MOCK_S3=1` 打开。

### `/api-docs` 打不开或 schema 过旧

先跑：

```bash
bun run prebuild
```

然后重启 `bun run dev`。

### OAuth 回调地址不对

优先检查 `.env` 里的 `BETTER_AUTH_URL` 是否与本地访问地址一致。

### 本地数据库状态混乱

确认当前库是开发库，再重新应用 migration 和 seed：

```bash
bun run prisma:deploy
bun run dev:reset-scenarios
bun run dev:seed-scenarios
```

## 下一步阅读

- 贡献与提交流程：[contributing.md](./contributing.md)
- 文档总览：[README.md](./README.md)
- 系统设计：[system-design.md](./system-design.md)
