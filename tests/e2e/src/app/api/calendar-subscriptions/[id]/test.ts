import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/calendar-subscriptions/[id]", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/calendar-subscriptions/[id]",
  });
});

test("/api/calendar-subscriptions/[id] token 校验生效", async ({ page }) => {
  await signInAsDebugUser(page, "/dashboard");
  const currentResponse = await page.request.get(
    "/api/calendar-subscriptions/current",
  );
  expect(currentResponse.status()).toBe(200);
  const currentBody = (await currentResponse.json()) as {
    token?: string;
    subscription?: { id?: number };
  };
  const subscriptionId = currentBody.subscription?.id;
  expect(subscriptionId).toBeDefined();

  const unauthorized = await page.request.get(
    `/api/calendar-subscriptions/${subscriptionId}`,
  );
  expect(unauthorized.status()).toBe(401);

  const authorized = await page.request.get(
    `/api/calendar-subscriptions/${subscriptionId}`,
    {
      headers: { Authorization: `Bearer ${currentBody.token}` },
    },
  );
  expect(authorized.status()).toBe(200);
  const body = (await authorized.json()) as {
    id?: number;
    sections?: unknown[];
  };
  expect(body.id).toBe(subscriptionId);
  expect((body.sections?.length ?? 0) > 0).toBe(true);
});
