import { expect, test } from "@playwright/test";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/locale", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/locale" });
});

test("/api/locale 非法 locale 返回 400", async ({ request }) => {
  const response = await request.post("/api/locale", {
    data: { locale: "invalid-locale" },
  });
  expect(response.status()).toBe(400);
});
