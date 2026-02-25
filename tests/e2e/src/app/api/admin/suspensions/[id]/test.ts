import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../../utils/auth";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/admin/suspensions/[id]", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/admin/suspensions/[id]",
  });
});

test("/api/admin/suspensions/[id] PATCH 可解封 seed 记录", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin");

  const listResponse = await page.request.get("/api/admin/suspensions");
  expect(listResponse.status()).toBe(200);
  const listBody = (await listResponse.json()) as {
    suspensions?: Array<{ id?: string; reason?: string | null }>;
  };
  const suspension = listBody.suspensions?.find((item) =>
    item.reason?.includes(DEV_SEED.suspensions.reasonKeyword),
  );
  expect(suspension?.id).toBeTruthy();

  const patchResponse = await page.request.patch(
    `/api/admin/suspensions/${suspension?.id}`,
  );
  expect(patchResponse.status()).toBe(200);
  const patchBody = (await patchResponse.json()) as {
    suspension?: {
      id?: string;
      liftedAt?: string | null;
      liftedById?: string | null;
    };
  };
  expect(patchBody.suspension?.id).toBe(suspension?.id);
  expect(patchBody.suspension?.liftedAt).toBeTruthy();
  expect(patchBody.suspension?.liftedById).toBeTruthy();
});
