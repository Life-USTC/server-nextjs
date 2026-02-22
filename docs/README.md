# 文档导航

本目录记录项目约定、架构信息与外部参考镜像。默认先读本文件，再按主题深入。

## 阅读顺序

1. `docs/project-overview.md`：项目目标、技术栈、核心目录。
2. `docs/dev-workflow.md`：日常开发流程与提交前验证。
3. `docs/testing.md`：测试分层、E2E 覆盖要求与调试方式。
4. 按需阅读专项文档（API、Prisma、i18n、UI、评论系统）。

## 文档分层

### 约定与规范

- `docs/dev-workflow.md`
- `docs/api-patterns.md`
- `docs/prisma-and-database.md`
- `docs/i18n.md`
- `docs/ui-rules.md`
- `docs/testing.md`
- `docs/documentation-guidelines.md`

### 架构与专题

- `docs/project-overview.md`
- `docs/comments-system.md`
- `docs/page-api-design.md`

### 清单与索引

- `docs/urls.md`：页面路由、动态路由、重定向与文档路由清单。

### 外部镜像

- `docs/cossui.md`：COSS UI `llms.txt` 快照与镜像索引。
- `docs/cossui/*.md`：从 `https://coss.com/ui/llms.txt` 抓取的文档镜像。

## 维护规则

- 代码改动涉及行为变化时，同步更新对应文档与 `docs/urls.md`。
- 新文档优先放在 `docs/`，避免规则散落到 PR 描述或临时笔记。
- 出现冲突时，优先采用“更具体、离代码更近、更新时间更新”的文档，并在同次改动里消除冲突。
- 约定类文档优先采用统一结构：`适用范围` → `规则清单` → `示例` → `更新触发`。
