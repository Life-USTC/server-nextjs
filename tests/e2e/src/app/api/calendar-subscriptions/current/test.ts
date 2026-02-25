import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/calendar-subscriptions/current", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/calendar-subscriptions/current",
  });
});

test("/api/calendar-subscriptions/current 登录后返回 subscription 与 token", async ({
  page,
}) => {
  await signInAsDebugUser(page, "/dashboard");

  const sectionMatch = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(sectionMatch.status()).toBe(200);
  const sectionBody = (await sectionMatch.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const seedSectionId = sectionBody.sections?.find(
    (item) => item.code === DEV_SEED.section.code,
  )?.id;
  expect(seedSectionId).toBeDefined();

  const response = await page.request.get(
    "/api/calendar-subscriptions/current",
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    token?: string;
    subscription?: { id?: number; sections?: Array<{ id?: number }> } | null;
  };
  expect(body.token).toBeTruthy();
  expect(body.subscription?.id).toBeTruthy();
  expect(
    body.subscription?.sections?.some(
      (section) => section.id === seedSectionId,
    ),
  ).toBe(true);
});
