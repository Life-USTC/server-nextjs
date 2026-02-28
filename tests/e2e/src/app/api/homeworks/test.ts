import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/homeworks", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/homeworks" });
});

test("/api/homeworks 返回 seed 作业与审计日志", async ({ page }) => {
  await signInAsDebugUser(page, "/");

  const matchResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(matchResponse.status()).toBe(200);
  const matchBody = (await matchResponse.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const sectionId = matchBody.sections?.find(
    (item) => item.code === DEV_SEED.section.code,
  )?.id;
  expect(sectionId).toBeDefined();

  const response = await page.request.get(
    `/api/homeworks?sectionId=${sectionId}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    viewer?: { userId?: string | null };
    homeworks?: Array<{
      title?: string;
      completion?: { completedAt?: string } | null;
    }>;
    auditLogs?: Array<{ action?: string; titleSnapshot?: string }>;
  };

  expect(body.viewer?.userId).toBeTruthy();
  expect(
    body.homeworks?.some((item) => item.title === DEV_SEED.homeworks.title),
  ).toBe(true);
  expect(
    body.homeworks?.some((item) => Object.hasOwn(item, "completion")),
  ).toBe(true);
  expect(
    body.auditLogs?.some(
      (item) =>
        item.action === "created" &&
        typeof item.titleSnapshot === "string" &&
        item.titleSnapshot.length > 0,
    ),
  ).toBe(true);
});
