import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/semesters/current", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/semesters/current" });
});

test("/api/semesters/current 命中 seed 学期", async ({ request }) => {
  const response = await request.get("/api/semesters/current");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { jwId?: number; code?: string };
  expect(body.jwId).toBe(DEV_SEED.semesterJwId);
  expect(body.code).toContain("DEV");
});
