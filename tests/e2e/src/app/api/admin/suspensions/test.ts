import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/admin/suspensions", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/admin/suspensions" });
});

test("/api/admin/suspensions 管理员可读取 seed 封禁记录", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin");

  const response = await page.request.get("/api/admin/suspensions");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    suspensions?: Array<{ reason?: string | null }>;
  };
  expect(
    body.suspensions?.some((item) =>
      item.reason?.includes(DEV_SEED.suspensions.reasonKeyword),
    ),
  ).toBe(true);
});
