# API 规范

## 适用范围

- 适用于 `src/app/api/**/route.ts` 下所有 Route Handlers。
- 适用于读接口与写接口（含 JSON 与非 JSON 响应）。
- 适用于需要分页、参数解析、鉴权与错误处理的接口。

## 规则清单

### 路由结构

- API 路由位于 `src/app/api/**/route.ts`。
- 使用 REST 风格资源，并用嵌套路由表示关联关系。
- 过滤、排序、分页优先使用查询参数。

### 输入校验

- Prisma 查询前必须校验输入。
- 数值统一使用 `parseInteger()` / `parseOptionalInt()` / `parseIntegerList()`。
- 参数错误推荐使用 `invalidParamResponse()` 返回 400。
- 复杂请求体使用 Zod schema（`safeParse`）后再进入业务逻辑。
- 查询参数同样使用 Zod schema 校验，非法查询参数直接返回 400。

### 分页与查询

- 使用 `getPagination(searchParams)` 解析输入。
- 使用 `buildPaginatedResponse()` 统一返回结构。
- 复用 `src/lib/query-helpers.ts` 的共享 include 与分页查询，避免各路由重复拼装。

### 错误处理

- 处理器必须使用 `try/catch`。
- 统一返回 `handleRouteError("message", error)`。
- 校验失败返回明确状态码（如 400/404）。
- 非 JSON 成功响应（如 `.ics`）也要统一处理失败分支。

### 契约与文档

- 使用 `next-openapi-gen` 生成 OpenAPI 文档。
- 通过 `bun run openapi:generate` 生成 `public/openapi.generated.json`。
- 提供 `GET /api/openapi` 兼容入口，返回生成产物内容。
- 提供 `GET /api-docs`（Swagger UI）用于联调与人工验收。

## 示例

标准读接口骨架，使用 `src/lib/api-helpers.ts` 与 `src/lib/query-helpers.ts` 共享工具。

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

## 更新触发

- 新增或修改 `src/app/api/**/route.ts`。
- 新增分页接口、参数解析逻辑或错误处理分支。
- 新增/调整 OpenAPI 暴露接口（`/api/openapi`、`/api-docs`）。
- 引入新校验规则（Zod schema、输入 helper）或变更错误码语义。
