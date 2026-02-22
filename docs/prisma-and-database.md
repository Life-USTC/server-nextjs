# Prisma 与数据库

## 适用范围

- 适用于 `prisma/schema.prisma`、`src/lib/query-helpers.ts` 与依赖 Prisma 的 API/页面查询。
- 适用于 include 复用、分页查询、关系读取与类型提取。

## 规则清单

### Schema 与生成

- 主 schema 位于 `prisma/schema.prisma`。
- 修改 schema 后必须执行 `bun run prisma:generate`。
- 涉及迁移时执行 `bun run prisma:migrate`，并在本地校验数据。

### 查询辅助与复用

- 共享 include 与分页查询位于 `src/lib/query-helpers.ts`。
- 分页接口使用 `src/lib/api-helpers.ts` 的 `getPagination()` 与 `buildPaginatedResponse()`。
- 优先复用共享查询片段，避免在 Route Handlers 里复制 include。

### 类型安全

- include 定义使用 `satisfies` 保持推断。
- 返回类型使用 `Prisma.*GetPayload` 与 include 绑定，避免手写结构漂移。

### 查询前输入校验

- ID 与数值使用 `parseInteger()` / `parseOptionalInt()` / `parseIntegerList()`。
- 复杂校验使用 Zod。

### 关系约定

- `Schedule <-> Teachers` 为多对多，使用 `schedule.teachers`（数组）。
- `Section -> Course/Semester/Campus/Department` 为多对一。
- `Section <-> Teachers`、`Section <-> AdminClasses` 为多对多。

## 示例

类型安全 include 写法：

```typescript
const sectionInclude = {
  course: true,
  semester: true,
} satisfies Prisma.SectionInclude;

type SectionWithRelations = Prisma.SectionGetPayload<{
  include: typeof sectionInclude;
}>;
```

## 更新触发

- 修改 `prisma/schema.prisma` 或新增/调整模型关系。
- 修改共享 include、分页查询 helper 或返回 payload 结构。
- 出现跨文件复制 include 的实现，需要回收至 `src/lib/query-helpers.ts`。
- 输入校验策略从原生解析迁移到统一 helper 或 Zod。
