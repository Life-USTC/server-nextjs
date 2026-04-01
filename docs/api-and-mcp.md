# API 与 MCP

本项目对外能力不是一层东西，而是三层能力面。

## 站内能力

这是浏览器页面直接消费的能力，目标是让站内页面能围绕用户任务快速拿到所需数据。

它服务的是：

- 首页判断
- 详情页聚合
- 列表页浏览
- 少量就地编辑和管理动作

## API 能力

REST / OpenAPI 的存在目的，不是为了把所有内部函数都暴露出去，而是为了提供清晰、稳定、可集成的资源面。

它应该回答的是：

- 外部客户端能围绕哪些对象集成
- 这些对象的读取、写入和鉴权边界是什么
- 哪些契约需要稳定到足以被文档化和生成 schema

## MCP 能力

MCP 的定位和 REST 不同。它不是另一套公开 API，而是给工具型客户端提供受约束的操作面。

它的意义是：

- 把工具调用与页面请求分开
- 把权限、scope、resource indicator 收敛到单独边界
- 让 AI / agent / 外部工具以明确方式接入系统能力

## 为什么 API、OAuth、MCP 要同时存在

- 页面需要的是站内交互能力
- 第三方客户端需要的是稳定资源接口
- 工具调用需要的是更强约束的协议面

这三者解决的问题不同，所以不应该强行合并成一个入口。

## 权威来源

- 详细接口字段：运行应用后访问 `/api-docs`
- 生成后的 OpenAPI：[`../public/openapi.generated.json`](../public/openapi.generated.json)
- 更细的运行约束：[`../AGENTS.md`](../AGENTS.md)

## 开发者怎么使用这些入口

### 查看本地 API 文档

先启动应用：

```bash
bun run dev
```

然后访问：

- `/api-docs`
- `/openapi.generated.json`

前者适合交互式查看，后者适合被工具、生成器和测试直接消费。

### 更新 OpenAPI 相关产物

如果你改了 Route Handlers、schema 或 API 契约，至少检查：

```bash
bun run openapi:generate
bun run openapi:types
```

通常直接跑下面这个更省事：

```bash
bun run prebuild
```

它会同时完成 Prisma/OpenAPI 的主要生成步骤。

### 代码主要落点

- `src/app/api`：REST / Route Handlers
- `src/app/api-docs`：Swagger UI 页面
- `src/lib/mcp`：MCP 服务端实现与相关辅助
- `src/auth.ts` / `src/lib/oauth`：OAuth / OIDC 相关接线

### 什么时候改哪一层

- 页面自己消费的数据拼装：优先看站内页面与服务层
- 对外集成资源面：优先看 `src/app/api`
- 工具型客户端接入：优先看 `src/lib/mcp`

不要把页面临时需求直接扩散成公开 API，也不要把工具型调用和普通页面请求混成一套边界。
