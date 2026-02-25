import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/schedules", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/schedules" });
});

test("/api/schedules section 过滤返回 seed 班级排课", async ({ request }) => {
  const matchResponse = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(matchResponse.status()).toBe(200);
  const matchBody = (await matchResponse.json()) as {
    sections?: Array<{ id?: number }>;
  };
  const sectionId = matchBody.sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const response = await request.get(
    `/api/schedules?sectionId=${sectionId}&limit=20`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ section?: { jwId?: number } }>;
  };
  expect(
    body.data?.some((item) => item.section?.jwId === DEV_SEED.section.jwId),
  ).toBe(true);
});
