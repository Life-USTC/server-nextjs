# 项目概览

## 为什么存在

Life@USTC Server 为 USTC 师生提供课程与日程数据服务。它提供 REST API 并渲染页面，通过 Prisma 从 PostgreSQL 读取结构化学术数据，目标是保证数据访问一致、可靠且支持国际化。

## 核心能力

- 课程、班级、日程、教师等学术数据 API。
- App Router 页面用于浏览与详情展示。
- 共享查询辅助工具用于分页与 include 图。
- `en-us` 与 `zh-cn` 的国际化 UI。
- Coss UI 组件库确保一致的 UI 行为。

## 技术栈

- Next.js App Router、React、TypeScript。
- Prisma ORM + PostgreSQL。
- Tailwind CSS v4。
- Bun 用于脚本与开发流程。

## 架构概览

目录要点（非完整列表）：

- `src/app/`：路由、页面与服务端操作。
- `src/lib/`：API/Prisma/查询相关的共享工具。
- `messages/`：i18n 翻译文件。
- `prisma/schema.prisma`：数据模型定义。
