# Prisma 与数据库

## 采用原因
数据库 schema 是学术数据的唯一事实来源。Prisma 的共享查询辅助确保 include 图与分页查询的一致性。

## Schema 位置
- 主 schema：`prisma/schema.prisma`。
- 修改后使用 `bun run prisma:generate` 重新生成客户端。

## 查询辅助
- 共享 include 与分页查询位于 `src/lib/query-helpers.ts`。
- 使用这些辅助保持接口返回结构一致。
- 分页接口使用 `src/lib/api-helpers.ts` 的 `getPagination()` 与 `buildPaginatedResponse()`。

## 类型安全的 include
使用 `satisfies` 保持类型推断。

```typescript
const sectionInclude = {
  course: true,
  semester: true,
} satisfies Prisma.SectionInclude;

type SectionWithRelations = Prisma.SectionGetPayload<{
  include: typeof sectionInclude;
}>;
```

## 关系说明
- Schedule <-> Teachers 为多对多，使用 `schedule.teachers`（数组）。
- Section 与 Course、Semester、Campus、Department 为多对一。
- Section <-> Teachers、Section <-> AdminClasses 为多对多。

## 查询前输入校验
- ID 与数值使用 `parseInt()` 与 `Number.isNaN()` 校验。
- 复杂校验使用 Zod。
