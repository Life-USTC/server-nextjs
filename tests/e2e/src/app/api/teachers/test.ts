import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/teachers", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/teachers" });
});

test("/api/teachers 返回 seed 教师字段", async ({ request }) => {
  const response = await request.get(
    `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.code)}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ code?: string | null; nameCn?: string }>;
  };
  const teacher = body.data?.find(
    (item) => item.code === DEV_SEED.teacher.code,
  );
  expect(teacher?.nameCn).toBe(DEV_SEED.teacher.nameCn);
});
