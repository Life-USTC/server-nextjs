import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { captureStepScreenshot } from "../../../../../utils/screenshot";
import { createUploadedFileViaApi } from "../../../../../utils/uploads";

test("/api/uploads/[id] 可重命名并删除上传文件", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/");

  const filename = `e2e-api-upload-${Date.now()}.txt`;
  const renamedFilename = `renamed-${filename}`;
  const uploaded = await createUploadedFileViaApi(page.request, {
    filename,
    contents: "rename and delete",
  });

  try {
    const renameResponse = await page.request.patch(
      `/api/uploads/${uploaded.uploadId}`,
      {
        data: {
          filename: renamedFilename,
        },
      },
    );
    expect(renameResponse.status()).toBe(200);
    const renameBody = (await renameResponse.json()) as {
      upload?: { filename?: string };
    };
    expect(renameBody.upload?.filename).toBe(renamedFilename);

    const downloadResponse = await page.request.get(
      `/api/uploads/${uploaded.uploadId}/download`,
    );
    expect(downloadResponse.status()).toBe(200);
    expect(downloadResponse.headers()["content-disposition"]).toContain(
      renamedFilename,
    );
    await captureStepScreenshot(page, testInfo, "api-uploads-renamed");
  } finally {
    const deleteResponse = await page.request.delete(
      `/api/uploads/${uploaded.uploadId}`,
    );
    expect(deleteResponse.status()).toBe(200);
  }
});
