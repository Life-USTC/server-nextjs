# 文档导航

这个目录现在分成两类内容：

- 入口与操作文档：帮助你把项目跑起来、改起来、发出去
- 解释型文档：帮助你理解产品目标、设计取舍和系统边界

如果你是第一次进入仓库，先从根目录的 [`../README.md`](../README.md) 开始。

## 按任务阅读

### 我想把项目跑起来

1. [`../README.md`](../README.md)
2. [`getting-started.md`](./getting-started.md)

### 我更关心“项目是什么、为什么这么设计”

1. [`product-goals.md`](./product-goals.md)
2. [`design-principles.md`](./design-principles.md)
3. [`system-design.md`](./system-design.md)
4. [`api-and-mcp.md`](./api-and-mcp.md)

### 我想改功能并提交

1. [`contributing.md`](./contributing.md)
2. [`development-rules.md`](./development-rules.md)
3. [`e2e/CONTRIBUTING.md`](./e2e/CONTRIBUTING.md)
4. [`e2e/COVERAGE.md`](./e2e/COVERAGE.md)
5. [`product-goals.md`](./product-goals.md)
6. [`design-principles.md`](./design-principles.md)
7. [`system-design.md`](./system-design.md)
8. [`api-and-mcp.md`](./api-and-mcp.md)
9. [`development-rules.md`](./development-rules.md)

### 我想发布或排查生产

1. [`deployment.md`](./deployment.md)
2. [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)
3. [`../.github/workflows/cd.yml`](../.github/workflows/cd.yml)

## 解释型文档

这些文档不追求穷举实现细节，而是沉淀稳定约束：

- [`product-goals.md`](./product-goals.md)：这个项目最终想帮用户完成什么
- [`design-principles.md`](./design-principles.md)：这些目标应该如何体现在 UI / UX 上
- [`system-design.md`](./system-design.md)：产品、页面、服务、数据如何分层
- [`api-and-mcp.md`](./api-and-mcp.md)：为什么页面、API、OAuth、MCP 要分层存在
- [`development-rules.md`](./development-rules.md)：实现和交付时需要持续遵守什么

## 参考入口

- 详细接口字段：运行应用后访问 `/api-docs`
- 生成后的 OpenAPI：[`../public/openapi.generated.json`](../public/openapi.generated.json)
- 数据结构最终约束：[`../prisma/schema.prisma`](../prisma/schema.prisma)
- 变更记录：[`../CHANGELOG.md`](../CHANGELOG.md)

## UI 子文档

`docs/cossui/` 下是组件与设计系统相关文档，它们属于 UI 子系统资料，不是业务域入口文档：

- [`cossui/index.md`](./cossui/index.md)
