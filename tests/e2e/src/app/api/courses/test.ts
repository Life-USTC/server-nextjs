import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/courses", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/courses" });
});

test("/api/courses 返回 seed 课程字段", async ({ request }) => {
  const response = await request.get(
    `/api/courses?search=${encodeURIComponent(DEV_SEED.course.code)}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ code?: string; nameCn?: string; jwId?: number }>;
  };
  const course = body.data?.find((item) => item.jwId === DEV_SEED.course.jwId);
  expect(course?.code).toBe(DEV_SEED.course.code);
  expect(course?.nameCn).toBe(DEV_SEED.course.nameCn);
});
