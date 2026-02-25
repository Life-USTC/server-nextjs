import { expect, test } from "@playwright/test";
import {
  signInAsDebugUser,
  signInAsDevAdmin,
} from "../../../../../../utils/auth";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/uploads/[id]/download", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/uploads/[id]/download" });
});

test("/api/uploads/[id]/download 未登录返回 401", async ({ request }) => {
  const response = await request.get("/api/uploads/invalid-e2e/download");
  expect(response.status()).toBe(401);
});

test("/api/uploads/[id]/download 非本人返回 404", async ({ browser }) => {
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  await signInAsDebugUser(userPage, "/dashboard");

  const uploadsResponse = await userPage.request.get("/api/uploads");
  expect(uploadsResponse.status()).toBe(200);
  const uploadsBody = (await uploadsResponse.json()) as {
    uploads?: Array<{ id?: string }>;
  };
  const uploadId = uploadsBody.uploads?.find((item) => item.id)?.id;
  expect(typeof uploadId).toBe("string");
  await userContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await signInAsDevAdmin(adminPage, "/dashboard");

  const downloadResponse = await adminPage.request.get(
    `/api/uploads/${uploadId}/download`,
    { maxRedirects: 0 },
  );
  expect(downloadResponse.status()).toBe(404);
  await adminContext.close();
});
