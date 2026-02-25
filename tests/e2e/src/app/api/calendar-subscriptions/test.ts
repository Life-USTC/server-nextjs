import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/calendar-subscriptions", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/calendar-subscriptions",
  });
});

test("/api/calendar-subscriptions 未登录创建返回 401", async ({ request }) => {
  const response = await request.post("/api/calendar-subscriptions", {
    data: { sectionIds: [1] },
  });
  expect(response.status()).toBe(401);
});

test("/api/calendar-subscriptions 登录后可创建并包含 seed section", async ({
  page,
}) => {
  await signInAsDebugUser(page, "/dashboard");
  const matchResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  const sectionId = (
    (await matchResponse.json()) as {
      sections?: Array<{ id?: number }>;
    }
  ).sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const response = await page.request.post("/api/calendar-subscriptions", {
    data: { sectionIds: [sectionId] },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    token?: string;
    subscription?: { sections?: Array<{ id?: number }> };
  };
  expect(body.token).toBeTruthy();
  expect(
    body.subscription?.sections?.some((item) => item.id === sectionId),
  ).toBe(true);
});
