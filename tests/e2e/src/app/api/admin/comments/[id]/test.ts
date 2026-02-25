import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../../utils/auth";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/admin/comments/[id]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/admin/comments/[id]" });
});

test("/api/admin/comments/[id] 无效请求体返回 400", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin");
  const listResponse = await page.request.get("/api/admin/comments?limit=1");
  expect(listResponse.status()).toBe(200);
  const commentId = (
    (await listResponse.json()) as {
      comments?: Array<{ id?: string }>;
    }
  ).comments?.[0]?.id;
  expect(commentId).toBeTruthy();

  const response = await page.request.patch(
    `/api/admin/comments/${commentId}`,
    {
      data: {},
    },
  );
  expect(response.status()).toBe(400);
});
