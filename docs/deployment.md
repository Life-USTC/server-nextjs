# 部署与发布

## 线上地址

- 生产站点：<https://life-ustc.tiankaima.dev>

## CI/CD 模型

- **CI**（push / PR）：Biome 检查 → prebuild → TypeScript typecheck → Playwright E2E
- **CD**（main 分支）：检测 migration 变更 → 按需 `prisma:deploy` → 构建 Docker 镜像 → 推送至 `ghcr.io`
- **部署**：CD 不会自动更新生产环境，仍需人工在服务器上更新

## 生产环境位置

服务器 `jp-2`：

| 服务 | 路径 |
| --- | --- |
| 项目 | `/srv/docker/life-ustc/docker-compose.yml` |
| PostgreSQL | `/srv/docker/postgres/docker-compose.yml` |
| Caddy | `/srv/docker/caddy/docker-compose.yml` |

## 数据库迁移

- 开发阶段：`bun run prisma:migrate`
- 部署/CI：`bun run prisma:deploy`
- CD 检测到 `prisma/migrations/**` 变更时会自动执行 `prisma:deploy`
