import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../../utils/auth";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/comments/[id]/reactions", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/comments/[id]/reactions",
  });
});

test("/api/comments/[id]/reactions 登录后可添加与删除", async ({ page }) => {
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

  const commentsResponse = await page.request.get(
    `/api/comments?targetType=section&targetId=${sectionId}`,
  );
  const commentId = (
    (await commentsResponse.json()) as {
      comments?: Array<{ id?: string }>;
    }
  ).comments?.[0]?.id;
  expect(commentId).toBeTruthy();

  const createResponse = await page.request.post(
    `/api/comments/${commentId}/reactions`,
    { data: { type: "rocket" } },
  );
  expect(createResponse.status()).toBe(200);
  expect((await createResponse.json()) as { success?: boolean }).toEqual({
    success: true,
  });

  const deleteResponse = await page.request.delete(
    `/api/comments/${commentId}/reactions?type=rocket`,
  );
  expect(deleteResponse.status()).toBe(200);
  expect((await deleteResponse.json()) as { success?: boolean }).toEqual({
    success: true,
  });
});
