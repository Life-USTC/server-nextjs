# prisma/

## Schema

`schema.prisma` 包含所有数据模型。主要分组：

- **教务数据**（从 USTC 教务系统导入）：Course、Section、Schedule、Teacher、Exam、Campus、Building、Room、Semester、Department
- **用户内容**：Homework、HomeworkCompletion、Todo、Comment、CommentReaction、Upload、Description
- **鉴权**（Better Auth）：User、Account、Session、Jwks、OAuthClient、OAuthAccessToken 等
- **其他**：Bus*（校车）、UserSuspension、DashboardLink*

## 约定

- 修改 schema 后运行 `bun run prisma:migrate` 创建 migration
- 然后运行 `bun run prebuild` 重新生成 Prisma client 和 OpenAPI types
- 新模型需要在 `tools/seed-dev-scenarios.ts` 中补充 seed 数据
- 命名：`id`（自增主键）、`jwId`（教务系统外键）、`nameCn`/`nameEn`（双语名称）、`createdAt`/`updatedAt`
