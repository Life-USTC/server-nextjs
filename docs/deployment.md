# 部署与发布

这份文档说明仓库的 CI/CD 做什么、不做什么，以及生产环境部署落在哪里。

## 线上地址

- 生产站点：<https://life-ustc.tiankaima.dev>

## CI 会做什么

GitHub Actions CI 会在 push / pull request 时执行：

- Biome 检查
- `bun run prebuild`
- TypeScript typecheck
- Playwright E2E

对应 workflow：

- [../.github/workflows/ci.yml](../.github/workflows/ci.yml)

## CD 会做什么

`main` 分支和版本 tag 上的 CD 会执行这些动作：

1. 检查本次变更是否包含 `prisma/migrations/**`
2. 如果有 migration 变更，则在 CI 环境执行 `bun run prisma:deploy`
3. 构建 Docker 镜像
4. 将镜像推送到 `ghcr.io`

对应 workflow：

- [../.github/workflows/cd.yml](../.github/workflows/cd.yml)

## CD 不会做什么

当前没有自动把新镜像部署到生产服务器。

也就是说：

- GitHub Actions 会把镜像构建并推送好
- 但生产环境 compose 不会自动更新
- 仍然需要人工到服务器完成部署更新

## 生产环境位置

生产相关 compose 文件位于服务器 `jp-2`：

- 项目：`/srv/docker/life-ustc/docker-compose.yml`
- PostgreSQL：`/srv/docker/postgres/docker-compose.yml`
- Caddy：`/srv/docker/caddy/docker-compose.yml`

如果需要查看日志或确认线上状态，按仓库协作约定可使用：

```bash
ssh jp-2
```

## 手工部署时至少要确认

1. 目标镜像已经在 `ghcr.io` 可用
2. 如果本次包含 Prisma migrations，线上数据库已成功执行 `prisma:deploy`
3. 服务器上的项目 compose 已更新到目标镜像 tag
4. 站点首页和 `/api-docs` 可正常访问

## 数据库迁移策略

仓库把 Prisma migration 当作正式部署资产管理：

- 开发阶段创建 migration：`bun run prisma:migrate`
- 本地初始化 / CI / 部署环境应用 migration：`bun run prisma:deploy`

当 `main` 分支检测到 migration 文件发生变化时，CD 会额外跑一次 `prisma:deploy`。

## 镜像与构建

Docker 构建逻辑位于：

- [../Dockerfile](../Dockerfile)

构建阶段会：

- 安装依赖
- 执行 `bun run build`
- 将 `.next`、`public`、`prisma`、`tools`、`src/generated` 等运行所需文件复制进最终镜像

## 建议的发布核对项

- GitHub Actions 的 CI 与 CD 都已通过
- 需要的 migration 已生成并提交
- OpenAPI / Prisma 生成产物已随代码提交
- 生产环境更新后首页正常
- 关键集成点（登录、主要页面、`/api-docs`）正常
