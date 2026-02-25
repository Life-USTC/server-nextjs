import { expect, test } from "@playwright/test";

test("/api/mock-s3", async ({ request }) => {
  const key = `e2e/mock-s3-${Date.now()}.txt`;
  const payload = "hello mock s3";

  const putResponse = await request.put(
    `/api/mock-s3?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(
      "text/plain",
    )}`,
    {
      data: payload,
      headers: {
        "content-type": "text/plain",
      },
    },
  );
  expect(putResponse.status()).toBe(200);

  const headResponse = await request.head(
    `/api/mock-s3?key=${encodeURIComponent(key)}`,
  );
  expect(headResponse.status()).toBe(200);
  expect(headResponse.headers()["content-type"]).toContain("text/plain");

  const getResponse = await request.get(
    `/api/mock-s3?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(
      "e2e.txt",
    )}`,
  );
  expect(getResponse.status()).toBe(200);
  expect(getResponse.headers()["content-type"]).toContain("text/plain");
  expect(await getResponse.text()).toBe(payload);

  const deleteResponse = await request.delete(
    `/api/mock-s3?key=${encodeURIComponent(key)}`,
  );
  expect(deleteResponse.status()).toBe(200);

  const missingResponse = await request.get(
    `/api/mock-s3?key=${encodeURIComponent(key)}`,
  );
  expect(missingResponse.status()).toBe(404);
});
