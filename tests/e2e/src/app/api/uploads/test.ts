import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { createUploadedFileViaApi } from "../../../../utils/uploads";

test("/api/uploads 未登录返回 401", async ({ page }) => {
  const response = await page.request.post("/api/uploads", {
    data: {
      filename: "unauthorized.txt",
      contentType: "text/plain",
      size: 12,
    },
  });

  expect(response.status()).toBe(401);
});

test("/api/uploads 可申请上传并完成文件入库", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/");

  const filename = `e2e-api-upload-${Date.now()}.txt`;
  const uploaded = await createUploadedFileViaApi(page.request, {
    filename,
    contents: "hello upload api",
  });

  const listResponse = await page.request.get("/api/uploads");
  expect(listResponse.status()).toBe(200);
  const listBody = (await listResponse.json()) as {
    uploads?: Array<{ id?: string; filename?: string }>;
  };
  expect(
    listBody.uploads?.some(
      (upload) => upload.id === uploaded.uploadId && upload.filename === filename,
    ),
  ).toBe(true);
  await captureStepScreenshot(page, testInfo, "api-uploads-created");

  const cleanupResponse = await page.request.delete(
    `/api/uploads/${uploaded.uploadId}`,
  );
  expect(cleanupResponse.status()).toBe(200);
});
