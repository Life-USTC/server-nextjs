# API 规范

## 采用原因
统一的路由结构与错误处理可提升 API 的可预测性与安全性。共享工具确保分页、过滤与错误返回格式一致。

## 路由结构
- API 路由位于 `src/app/api/**/route.ts`。
- 使用 REST 风格资源，并用嵌套路由表示关联关系。
- 过滤与分页优先使用查询参数。

## 标准路由骨架
使用 `src/lib/api-helpers.ts` 与 `src/lib/query-helpers.ts` 的共享工具。

```typescript
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
import { paginatedSectionQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);
  const where: Prisma.SectionWhereInput = {};

  try {
    const result = await paginatedSectionQuery(pagination.page, where);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("Failed to fetch sections", error);
  }
}
```

## 分页
- 使用 `getPagination(searchParams)` 解析输入。
- 使用 `buildPaginatedResponse()` 统一返回结构。

## 错误处理
- 处理器必须使用 `try/catch`。
- 统一返回 `handleRouteError("message", error)`。
- 参数校验失败需带明确状态码（如 400/404）。
- 非 JSON 成功响应（如 `.ics`）也要用 `handleRouteError` 处理失败。

## 输入校验
- Prisma 查询前必须校验输入。
- 数值统一使用 `parseInteger()` / `parseOptionalInt()` / `parseIntegerList()`。
- 参数错误推荐使用 `invalidParamResponse()` 返回 400。
- 复杂请求体使用 Zod schema（`safeParse`）后再进入业务逻辑。

## 契约文档
- 提供 `GET /api/openapi` 输出 OpenAPI 3.1 文档。
- 已覆盖主要 API 路径（含 admin、comments、homeworks、uploads、calendar 等）的契约条目。
- 新增 API 时同步补充 OpenAPI registry，保证接口契约可追踪。
