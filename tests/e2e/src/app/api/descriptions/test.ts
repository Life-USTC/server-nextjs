import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/descriptions", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/descriptions" });
});

test("/api/descriptions 返回 seed 描述正文", async ({ request }) => {
  const matchResponse = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(matchResponse.status()).toBe(200);
  const matchBody = (await matchResponse.json()) as {
    sections?: Array<{ id?: number }>;
  };
  const sectionId = matchBody.sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const response = await request.get(
    `/api/descriptions?targetType=section&targetId=${sectionId}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    description?: { content?: string };
  };
  expect(body.description?.content).toContain("DEV-SCENARIO");
});

test("/api/descriptions 登录后可更新描述内容", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const matchResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  const sectionId = (
    (await matchResponse.json()) as {
      sections?: Array<{ id?: number }>;
    }
  ).sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const content = `e2e-description-${Date.now()}`;
  const postResponse = await page.request.post("/api/descriptions", {
    data: {
      targetType: "section",
      targetId: String(sectionId),
      content,
    },
  });
  expect(postResponse.status()).toBe(200);
  const postBody = (await postResponse.json()) as {
    id?: string;
    updated?: boolean;
  };
  expect(postBody.id).toBeTruthy();
  expect(postBody.updated).toBe(true);

  const getResponse = await page.request.get(
    `/api/descriptions?targetType=section&targetId=${sectionId}`,
  );
  expect(getResponse.status()).toBe(200);
  const getBody = (await getResponse.json()) as {
    description?: { content?: string };
  };
  expect(getBody.description?.content).toContain(content);
});
