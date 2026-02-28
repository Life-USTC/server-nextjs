import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/uploads", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/uploads" });
});

test("/api/uploads 未登录返回 401", async ({ request }) => {
  const response = await request.get("/api/uploads");
  expect(response.status()).toBe(401);
});

test("/api/uploads 登录后返回 seed 上传与配额字段", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const response = await page.request.get("/api/uploads");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    quotaBytes?: number;
    usedBytes?: number;
    uploads?: Array<{ filename?: string }>;
  };
  expect(typeof body.quotaBytes).toBe("number");
  expect(typeof body.usedBytes).toBe("number");
  expect(
    body.uploads?.some(
      (item) => item.filename === DEV_SEED.uploads.firstFilename,
    ),
  ).toBe(true);
});

test("/api/uploads POST 未登录返回 401", async ({ request }) => {
  const response = await request.post("/api/uploads", {
    data: { filename: "a.txt", size: 1, contentType: "text/plain" },
  });
  expect(response.status()).toBe(401);
});

test("/api/uploads POST 非法 payload 返回 400", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const response = await page.request.post("/api/uploads", {
    data: { filename: "", size: 1, contentType: "text/plain" },
  });
  expect(response.status()).toBe(400);
  const body = (await response.json()) as { error?: string };
  expect(typeof body.error).toBe("string");
});

test("/api/uploads POST 超大文件返回 413", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const response = await page.request.post("/api/uploads", {
    data: {
      filename: "too-big.bin",
      size: 50 * 1024 * 1024 + 1,
      contentType: "application/octet-stream",
    },
  });
  expect(response.status()).toBe(413);
});
