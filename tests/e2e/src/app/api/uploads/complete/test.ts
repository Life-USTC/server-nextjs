import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/uploads/complete", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/uploads/complete" });
});

test("/api/uploads/complete 未登录返回 401", async ({ request }) => {
  const response = await request.post("/api/uploads/complete", {
    data: {
      key: "uploads/anonymous/test.txt",
      filename: "test.txt",
    },
  });
  expect(response.status()).toBe(401);
});

test("/api/uploads/complete key 前缀不匹配返回 403", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const response = await page.request.post("/api/uploads/complete", {
    data: {
      key: "uploads/other-user/test.txt",
      filename: "test.txt",
    },
  });
  expect(response.status()).toBe(403);
});

test("/api/uploads/complete 无 pending 时返回 Upload session expired 且清理对象", async ({
  page,
}) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/");

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.status()).toBe(200);
  const session = (await sessionResponse.json()) as {
    user?: { id?: string };
  };
  const userId = session.user?.id;
  expect(typeof userId).toBe("string");

  const key = `uploads/${userId}/e2e-expired-${Date.now()}.txt`;
  const putResponse = await page.request.put(
    `/api/mock-s3?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(
      "text/plain",
    )}`,
    {
      data: "expired",
      headers: { "content-type": "text/plain" },
    },
  );
  expect(putResponse.status()).toBe(200);

  const completeResponse = await page.request.post("/api/uploads/complete", {
    data: { key, filename: "e2e-expired.txt" },
  });
  expect(completeResponse.status()).toBe(400);
  const completeBody = (await completeResponse.json()) as { error?: string };
  expect(completeBody.error).toContain("Upload session expired");

  const missingResponse = await page.request.get(
    `/api/mock-s3?key=${encodeURIComponent(key)}`,
  );
  expect(missingResponse.status()).toBe(404);
});
