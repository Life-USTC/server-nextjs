import { expect, test } from "@playwright/test";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/openapi", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/openapi" });
});

test("/api/openapi OpenAPI 内容包含关键路径", async ({ request }) => {
  const response = await request.get("/api/openapi");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    openapi?: string;
    paths?: Record<string, unknown>;
  };

  expect(body.openapi).toBe("3.0.0");
  expect(body.paths?.["/api/sections/match-codes"]).toBeTruthy();
  expect(body.paths?.["/api/homeworks"]).toBeTruthy();
  expect(body.paths?.["/api/descriptions"]).toBeTruthy();
});

test("/api/openapi 静态 openapi.generated.json 可访问", async ({ request }) => {
  const response = await request.get("/openapi.generated.json");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");

  const body = (await response.json()) as {
    openapi?: string;
    info?: { title?: string };
  };
  expect(body.openapi).toBe("3.0.0");
  expect(body.info?.title).toBe("Life@USTC API");
});
