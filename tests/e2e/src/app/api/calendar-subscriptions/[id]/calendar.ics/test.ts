import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../../utils/auth";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/calendar-subscriptions/[id]/calendar.ics", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/calendar-subscriptions/[id]/calendar.ics",
  });
});

test("/api/calendar-subscriptions/[id]/calendar.ics 鉴权后跳转到 sections.ics", async ({
  page,
}) => {
  await signInAsDebugUser(page, "/dashboard");
  const currentResponse = await page.request.get(
    "/api/calendar-subscriptions/current",
  );
  const currentBody = (await currentResponse.json()) as {
    token?: string;
    subscription?: { id?: number };
  };
  const subscriptionId = currentBody.subscription?.id;
  expect(subscriptionId).toBeDefined();

  const response = await page.request.get(
    `/api/calendar-subscriptions/${subscriptionId}/calendar.ics`,
    {
      headers: { Authorization: `Bearer ${currentBody.token}` },
      maxRedirects: 0,
    },
  );
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/api/sections/calendar.ics");
});
