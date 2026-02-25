import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/sections", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/sections" });
});

test("/api/sections 可按 teacherId 过滤到 seed 班级", async ({ request }) => {
  const teacherResponse = await request.get(
    `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}&limit=5`,
  );
  expect(teacherResponse.status()).toBe(200);
  const teacherBody = (await teacherResponse.json()) as {
    data?: Array<{ id?: number }>;
  };
  const teacherId = teacherBody.data?.[0]?.id;
  expect(teacherId).toBeDefined();

  const response = await request.get(
    `/api/sections?teacherId=${teacherId}&limit=20`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ code?: string }>;
  };
  expect(body.data?.some((item) => item.code === DEV_SEED.section.code)).toBe(
    true,
  );
});
