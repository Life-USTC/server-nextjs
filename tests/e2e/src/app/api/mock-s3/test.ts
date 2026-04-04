/**
 * E2E tests for /api/mock-s3 (PUT / GET / HEAD / DELETE)
 *
 * In-memory mock S3 storage used during E2E testing (enabled via E2E_MOCK_S3=1).
 *
 * - PUT uploads an object with a `key` and optional `contentType`
 *   Returns `{ ok: true, size }` on success
 * - HEAD returns object metadata (content-type, content-length) without body
 * - GET downloads the object; supports `filename` for content-disposition header
 * - DELETE removes the object; returns `{ ok: true }`
 * - All methods return 404 when mock S3 is disabled
 * - Missing `key` parameter returns 400
 * - GET/HEAD on a nonexistent key returns 404
 */
import { expect, test } from "@playwright/test";

const BASE = "/api/mock-s3";

test.describe("/api/mock-s3", () => {
  test("full upload → check → download → delete lifecycle", async ({
    request,
  }) => {
    const key = `e2e/mock-s3-${Date.now()}.txt`;
    const payload = "hello mock s3";

    // PUT: upload the object.
    const putResponse = await request.put(
      `${BASE}?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent("text/plain")}`,
      {
        data: payload,
        headers: { "content-type": "text/plain" },
      },
    );
    expect(putResponse.status()).toBe(200);

    // HEAD: verify metadata.
    const headResponse = await request.head(
      `${BASE}?key=${encodeURIComponent(key)}`,
    );
    expect(headResponse.status()).toBe(200);
    expect(headResponse.headers()["content-type"]).toContain("text/plain");

    // GET: download and verify content + headers.
    const getResponse = await request.get(
      `${BASE}?key=${encodeURIComponent(key)}&filename=${encodeURIComponent("e2e.txt")}`,
    );
    expect(getResponse.status()).toBe(200);
    expect(getResponse.headers()["content-type"]).toContain("text/plain");
    expect(await getResponse.text()).toBe(payload);

    // DELETE: remove the object.
    const deleteResponse = await request.delete(
      `${BASE}?key=${encodeURIComponent(key)}`,
    );
    expect(deleteResponse.status()).toBe(200);

    // GET after DELETE: should be 404.
    const missingResponse = await request.get(
      `${BASE}?key=${encodeURIComponent(key)}`,
    );
    expect(missingResponse.status()).toBe(404);
  });

  test("missing key parameter returns 400", async ({ request }) => {
    const response = await request.put(BASE, {
      data: "no key",
      headers: { "content-type": "text/plain" },
    });
    expect(response.status()).toBe(400);
  });
});
