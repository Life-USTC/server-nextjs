import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/semesters", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/semesters" });
});

test("/api/semesters 列表包含 seed 学期", async ({ request }) => {
  const response = await request.get("/api/semesters?limit=20");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ jwId?: number; nameCn?: string }>;
  };
  const semester = body.data?.find(
    (item) => item.jwId === DEV_SEED.semesterJwId,
  );
  expect(semester?.nameCn).toContain("测试学期");
});
