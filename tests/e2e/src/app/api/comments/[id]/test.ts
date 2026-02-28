import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/comments/[id]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/comments/[id]" });
});

test("/api/comments/[id] 返回线程 focus 与 target", async ({ request }) => {
  const matchResponse = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(matchResponse.status()).toBe(200);
  const sectionId = (
    (await matchResponse.json()) as {
      sections?: Array<{ id?: number }>;
    }
  ).sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const commentsResponse = await request.get(
    `/api/comments?targetType=section&targetId=${sectionId}`,
  );
  expect(commentsResponse.status()).toBe(200);
  const commentId = (
    (await commentsResponse.json()) as {
      comments?: Array<{ id?: string }>;
    }
  ).comments?.[0]?.id;
  expect(commentId).toBeTruthy();

  const threadResponse = await request.get(`/api/comments/${commentId}`);
  expect(threadResponse.status()).toBe(200);
  const body = (await threadResponse.json()) as {
    focusId?: string;
    target?: { sectionJwId?: number };
    thread?: unknown[];
  };
  expect(body.focusId).toBe(commentId);
  expect(body.target?.sectionJwId).toBe(DEV_SEED.section.jwId);
  expect((body.thread?.length ?? 0) > 0).toBe(true);
});

test("/api/comments/[id] 登录后可修改并删除评论", async ({ page }) => {
  await signInAsDebugUser(page, "/");

  const matchResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  const sectionId = (
    (await matchResponse.json()) as { sections?: Array<{ id?: number }> }
  ).sections?.[0]?.id;
  expect(sectionId).toBeDefined();

  const content = `e2e-editable-comment-${Date.now()}`;
  const createResponse = await page.request.post("/api/comments", {
    data: {
      targetType: "section",
      targetId: String(sectionId),
      body: content,
      visibility: "public",
    },
  });
  expect(createResponse.status()).toBe(200);
  const commentId = ((await createResponse.json()) as { id?: string }).id;
  expect(commentId).toBeTruthy();

  const edited = `${content}-edited`;
  const patchResponse = await page.request.patch(`/api/comments/${commentId}`, {
    data: {
      body: edited,
      visibility: "logged_in_only",
      isAnonymous: false,
      attachmentIds: [],
    },
  });
  expect(patchResponse.status()).toBe(200);
  const patchBody = (await patchResponse.json()) as {
    success?: boolean;
    comment?: { body?: string; visibility?: string };
  };
  expect(patchBody.success).toBe(true);
  expect(patchBody.comment?.body).toBe(edited);
  expect(patchBody.comment?.visibility).toBe("logged_in_only");

  const deleteResponse = await page.request.delete(
    `/api/comments/${commentId}`,
  );
  expect(deleteResponse.status()).toBe(200);
  expect((await deleteResponse.json()) as { success?: boolean }).toEqual({
    success: true,
  });
});
