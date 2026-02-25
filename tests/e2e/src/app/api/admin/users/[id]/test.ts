import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../../utils/auth";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/admin/users/[id]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/admin/users/[id]" });
});

test("/api/admin/users/[id] 非法 username 更新返回 400", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin");
  const listResponse = await page.request.get("/api/admin/users?limit=1");
  expect(listResponse.status()).toBe(200);
  const userId = (
    (await listResponse.json()) as {
      data?: Array<{ id?: string }>;
    }
  ).data?.[0]?.id;
  expect(userId).toBeTruthy();

  const response = await page.request.patch(`/api/admin/users/${userId}`, {
    data: { username: "INVALID_USERNAME" },
  });
  expect(response.status()).toBe(400);
});
