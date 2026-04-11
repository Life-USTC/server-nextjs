# 贡献指南

## 基本原则

- 统一使用 `bun` / `bunx`
- 优先复用现有设计语言、页面职责和系统边界
- 只提交与当前任务直接相关的改动

## 提交前必须通过

```bash
bun run check --write
bun run build
bun run test:e2e
```

改了 Prisma schema / API 契约 / 生成产物后，需额外运行 `bun run prebuild` 并提交结果。

## Commit 约定

- 使用 conventional commit（`feat:`、`fix:`、`chore:` 等）
- 一次 commit 只包含一组直接相关的改动
- Git hooks（`.githooks/pre-commit`、`.githooks/commit-msg`）会自动检查

## 改动时的检查清单

- **改数据模型**：补 seed 数据、补 E2E、重新生成产物
- **改页面/交互**：检查 i18n、不破坏首页"判断面"定位
- **改 API / MCP**：确认 `/api-docs` 正常、OpenAPI 产物已更新

## 测试分工

- `bun run test`：纯逻辑、schema、状态机
- `bun run test:e2e`：路由、鉴权、页面/API 联动
- 详细 E2E 规范：[e2e/CONTRIBUTING.md](./e2e/CONTRIBUTING.md)

## 继续阅读

- [getting-started.md](./getting-started.md)：本地开发
- [development-rules.md](./development-rules.md)：开发规则
