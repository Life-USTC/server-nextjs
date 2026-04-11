# Life@USTC

把课程、班级、作业、考试、待办和评论重新组织成一个帮助用户判断"接下来该做什么"的工作台。

承载三类能力：站内页面、REST / OpenAPI、MCP + OAuth / OIDC。

## 文档

- [docs/product.md](./docs/product.md)：用户体验、业务逻辑、Web/API/MCP 接口
- [docs/engineering.md](./docs/engineering.md)：工程实现、规范、快速启动

## 快速开始

```bash
bun install --frozen-lockfile
bun run prisma:deploy
bun run dev:seed-scenarios
bun run dev
```
