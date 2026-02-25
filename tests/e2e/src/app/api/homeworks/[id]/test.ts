import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/homeworks/[id]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/homeworks/[id]" });
});

test("/api/homeworks/[id] 登录后可更新作业标题", async ({ page }) => {
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

  const listResponse = await page.request.get(
    `/api/homeworks?sectionId=${sectionId}`,
  );
  const homeworkId = (
    (await listResponse.json()) as {
      homeworks?: Array<{ id?: string }>;
    }
  ).homeworks?.[0]?.id;
  expect(homeworkId).toBeTruthy();

  const newTitle = `e2e-homework-title-${Date.now()}`;
  const patchResponse = await page.request.patch(
    `/api/homeworks/${homeworkId}`,
    {
      data: { title: newTitle },
    },
  );
  expect(patchResponse.status()).toBe(200);
  expect((await patchResponse.json()) as { success?: boolean }).toEqual({
    success: true,
  });

  const verifyResponse = await page.request.get(
    `/api/homeworks?sectionId=${sectionId}`,
  );
  const verifyBody = (await verifyResponse.json()) as {
    homeworks?: Array<{ id?: string; title?: string }>;
  };
  expect(
    verifyBody.homeworks?.some(
      (item) => item.id === homeworkId && item.title === newTitle,
    ),
  ).toBe(true);
});
