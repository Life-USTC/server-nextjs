# src/

- `app/`: 页面路由和 Route Handlers，按 Next.js App Router 组织
- `features/`: 按用户任务划分的业务域（首页、作业、待办、评论等）
- `components/`: 可复用 UI 组件
- `lib/`: 基础设施（鉴权、数据库、MCP、日志、存储等）
- `i18n/`: 国际化配置，使用 next-intl
- `shared/`: 跨 feature 共享的纯工具函数
- `hooks/`: React hooks
- `types/`: 全局类型定义
- `generated/`: 自动生成的代码（Prisma client、OpenAPI types），不要手动编辑

所有组件默认是 Server Component，只在需要交互（hooks、事件）时加 `"use client"`。
