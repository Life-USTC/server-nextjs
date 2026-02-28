import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/uploads/[id]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/uploads/[id]" });
});

test("/api/uploads/[id] PATCH 空文件名返回 400", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const uploadsResponse = await page.request.get("/api/uploads");
  expect(uploadsResponse.status()).toBe(200);
  const uploadId = (
    (await uploadsResponse.json()) as {
      uploads?: Array<{ id?: string }>;
    }
  ).uploads?.[0]?.id;
  expect(uploadId).toBeTruthy();

  const response = await page.request.patch(`/api/uploads/${uploadId}`, {
    data: { filename: "   " },
  });
  expect(response.status()).toBe(400);
});
