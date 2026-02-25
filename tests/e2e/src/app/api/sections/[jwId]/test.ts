import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/sections/[jwId]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/sections/[jwId]" });
});

test("/api/sections/[jwId] 返回 teacherAssignments 与 exams", async ({
  request,
}) => {
  const response = await request.get(`/api/sections/${DEV_SEED.section.jwId}`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    teacherAssignments?: unknown[];
    exams?: unknown[];
    code?: string;
  };
  expect(body.code).toBe(DEV_SEED.section.code);
  expect((body.teacherAssignments?.length ?? 0) > 0).toBe(true);
  expect((body.exams?.length ?? 0) > 0).toBe(true);
});
