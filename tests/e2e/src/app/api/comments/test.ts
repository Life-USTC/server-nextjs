import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/comments", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/comments" });
});

test("/api/comments 返回 section 目标与 seed 评论", async ({ request }) => {
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
    `/api/comments?targetType=section&targetId=${sectionId}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    target?: { type?: string; targetId?: number };
    comments?: Array<{ body?: string }>;
  };
  expect(body.target?.type).toBe("section");
  expect(body.target?.targetId).toBe(sectionId);
  expect(
    body.comments?.some((item) =>
      item.body?.includes(DEV_SEED.comments.sectionRootBody),
    ),
  ).toBe(true);
});

test("/api/comments 登录后可发布新评论", async ({ page }) => {
  await signInAsDebugUser(page, "/dashboard");

  const matchResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(matchResponse.status()).toBe(200);
  const sectionId = (
    (await matchResponse.json()) as { sections?: Array<{ id?: number }> }
  ).sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const content = `e2e-create-comment-${Date.now()}`;
  const createResponse = await page.request.post("/api/comments", {
    data: {
      targetType: "section",
      targetId: String(sectionId),
      body: content,
      visibility: "public",
    },
  });
  expect(createResponse.status()).toBe(200);
  const createdId = ((await createResponse.json()) as { id?: string }).id;
  expect(createdId).toBeTruthy();

  const listResponse = await page.request.get(
    `/api/comments?targetType=section&targetId=${sectionId}`,
  );
  expect(listResponse.status()).toBe(200);
  const listBody = (await listResponse.json()) as {
    comments?: Array<{ id?: string; body?: string }>;
  };
  expect(
    listBody.comments?.some(
      (item) => item.id === createdId && item.body === content,
    ),
  ).toBe(true);
});
