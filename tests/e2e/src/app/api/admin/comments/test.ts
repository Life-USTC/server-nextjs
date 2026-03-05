import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/admin/comments", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/admin/comments" });
});

test("/api/admin/comments 可按状态读取 softbanned 评论", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin");
  const response = await page.request.get(
    "/api/admin/comments?status=softbanned",
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ status?: string }>;
    pagination?: { total?: number };
  };
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data?.every((item) => item.status === "softbanned")).toBe(true);
});
