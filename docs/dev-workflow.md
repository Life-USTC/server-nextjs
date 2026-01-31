# 开发流程

## 为什么需要此流程
本项目依赖严格的 TypeScript、Prisma 类型安全与本地化 UI。该流程用于保持 API 契约与 UI 文案一致，并降低回归风险。

## 日常开发
1. 使用 `bun run dev` 启动开发服务。
2. 在 `src/` 中按既有模式修改代码。
3. 运行 `bun run check`（或依赖 pre-commit 自动执行 `bun run check --write`）。
4. 仅需要格式化时使用 `bun run format`。

## Git Hooks
使用 `bun run hooks:install` 安装 pre-commit hook，以自动执行 Biome。

## 数据库操作
当修改 `prisma/schema.prisma` 时：
1. 运行 `bun run prisma:generate` 生成客户端。
2. 运行 `bun run prisma:migrate` 创建并应用迁移。
3. 通过 `bun run prisma:studio` 检查本地数据。

## 本地数据导入
`bun run tools/load-from-static.ts` 会从 Life-USTC/static 仓库导入数据。

## 影响流程的约定
- 使用 `@/` 作为 `src/` 的导入别名。
- 数值输入使用 `parseInt()` 与 `Number.isNaN()` 校验。
- 面向用户的文案需同时更新 `messages/en-us.json` 与 `messages/zh-cn.json`。
- 不要修改 `src/components/ui/` 下的自动生成组件。
- 交互元素必须使用 `@/components/ui/*`（禁止原生 button/input）。

## 测试
当前未配置自动化测试框架。
- 单测运行：尚不可用，需先添加测试框架。
