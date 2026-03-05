import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/admin/descriptions", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/admin/descriptions" });
});

test("/api/admin/descriptions returns paginated structure", async ({
  page,
}) => {
  await signInAsDevAdmin(page, "/admin");
  const response = await page.request.get("/api/admin/descriptions");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: unknown[];
    pagination?: { total?: number };
  };
  expect(Array.isArray(body.data)).toBe(true);
  expect(typeof body.pagination?.total).toBe("number");
});
