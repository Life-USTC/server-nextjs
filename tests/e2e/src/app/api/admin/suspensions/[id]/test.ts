/**
 * E2E tests for PATCH /api/admin/suspensions/[id]
 *
 * Admin-only endpoint to lift (un-suspend) a single suspension.
 *
 * - PATCH sets liftedAt and liftedById on the suspension record
 * - No request body is needed
 * - Returns the updated suspension in `{ suspension: {...} }`
 * - Returns 401 for unauthenticated or non-admin requests
 * - Returns 400 for invalid suspension ID
 */
import { expect, test } from "@playwright/test";
import {
  signInAsDebugUser,
  signInAsDevAdmin,
} from "../../../../../../utils/auth";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import { assertApiContract } from "../../../../_shared/api-contract";

const BASE = "/api/admin/suspensions";

test.describe("PATCH /api/admin/suspensions/[id]", () => {
  test("api contract", async ({ request }) => {
    await assertApiContract(request, {
      routePath: `${BASE}/[id]`,
    });
  });

  test("unauthenticated PATCH returns 401", async ({ request }) => {
    const response = await request.patch(`${BASE}/nonexistent-id`);
    expect(response.status()).toBe(401);
  });

  test("non-admin PATCH returns 401", async ({ page }) => {
    await signInAsDebugUser(page, "/");
    const response = await page.request.patch(`${BASE}/nonexistent-id`);
    expect(response.status()).toBe(401);
  });

  test("admin can lift seed suspension", async ({ page }) => {
    await signInAsDevAdmin(page, "/admin");

    const listResponse = await page.request.get(BASE);
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      suspensions?: Array<{ id?: string; reason?: string | null }>;
    };
    const suspension = listBody.suspensions?.find((item) =>
      item.reason?.includes(DEV_SEED.suspensions.reasonKeyword),
    );
    expect(suspension?.id).toBeTruthy();

    const patchResponse = await page.request.patch(`${BASE}/${suspension?.id}`);
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
});
