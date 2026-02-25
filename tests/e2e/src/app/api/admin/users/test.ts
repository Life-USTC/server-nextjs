import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/admin/users", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/admin/users" });
});

test("/api/admin/users 管理员可检索 seed 用户", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin");
  const response = await page.request.get(
    `/api/admin/users?search=${DEV_SEED.debugUsername}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ username?: string | null }>;
  };
  expect(
    body.data?.some((item) => item.username === DEV_SEED.debugUsername),
  ).toBe(true);
});
