import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/sections/[jwId]/schedules", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/sections/[jwId]/schedules",
  });
});

test("/api/sections/[jwId]/schedules 返回排课明细", async ({ request }) => {
  const response = await request.get(
    `/api/sections/${DEV_SEED.section.jwId}/schedules`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as Array<{
    scheduleGroup?: { id?: number };
    teachers?: Array<{ nameCn?: string }>;
  }>;
  expect(body.length).toBeGreaterThan(0);
  expect(body.some((item) => Boolean(item.scheduleGroup?.id))).toBe(true);
  expect(
    body.some((item) =>
      item.teachers?.some(
        (teacher) => teacher.nameCn === DEV_SEED.teacher.nameCn,
      ),
    ),
  ).toBe(true);
});
