import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../../utils/auth";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/homeworks/[id]/completion", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/homeworks/[id]/completion",
  });
});

test("/api/homeworks/[id]/completion 可切换完成状态", async ({ page }) => {
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

  const completeResponse = await page.request.put(
    `/api/homeworks/${homeworkId}/completion`,
    { data: { completed: true } },
  );
  expect(completeResponse.status()).toBe(200);
  expect(
    (await completeResponse.json()) as {
      completed?: boolean;
      completedAt?: string | null;
    },
  ).toMatchObject({ completed: true });

  const undoResponse = await page.request.put(
    `/api/homeworks/${homeworkId}/completion`,
    { data: { completed: false } },
  );
  expect(undoResponse.status()).toBe(200);
  expect(
    (await undoResponse.json()) as {
      completed?: boolean;
      completedAt?: string | null;
    },
  ).toMatchObject({ completed: false, completedAt: null });
});
