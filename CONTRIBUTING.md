# 贡献

本仓库的完整贡献流程见：

- [docs/contributing.md](./docs/contributing.md)

如果你只想先跑最小流程，至少执行：

```bash
bun install --frozen-lockfile
bun run hooks:install
bun run check --write
bun run build
bun run test:e2e
```

相关入口：

- 本地开发：[docs/getting-started.md](./docs/getting-started.md)
- 文档总览：[docs/README.md](./docs/README.md)
