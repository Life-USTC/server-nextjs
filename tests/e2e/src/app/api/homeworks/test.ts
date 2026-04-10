/**
 * E2E tests for GET /api/homeworks and POST /api/homeworks.
 *
 * ## GET /api/homeworks
 * - Query: sectionId (required)
 * - Response: { viewer, homeworks[], auditLogs[] }
 * - Public endpoint: viewer.userId is null when unauthenticated
 * - Returns homeworks with completion status for the current user
 * - Includes audit logs for the section's homeworks
 *
 * ## POST /api/homeworks
 * - Body: { title, sectionId, publishedAt, submissionStartAt, submissionDueAt }
 * - Response: { success: true }
 * - Auth required (401 if unauthenticated)
 * - Creates a homework with an audit log entry (action: "created")
 * - Returns 400 for missing required fields
 *
 * ## Edge cases
 * - Missing sectionId on GET → 400
 * - Unauthenticated POST → 401
 * - Full create → verify in list → cleanup via DELETE
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

/** Resolve the seed section's internal DB id via match-codes. */
async function resolveSeedSectionId(
  request: import("@playwright/test").APIRequestContext,
) {
  const response = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const section = body.sections?.find((s) => s.code === DEV_SEED.section.code);
  expect(section?.id).toBeDefined();
  // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
  return section!.id!;
}

test("/api/homeworks", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/homeworks" });
});

test("/api/homeworks GET 返回 seed 作业、completion 与审计日志", async ({
  page,
}) => {
  await signInAsDebugUser(page, "/");
  const sectionId = await resolveSeedSectionId(page.request);

  const response = await page.request.get(
    `/api/homeworks?sectionId=${sectionId}`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    viewer?: { userId?: string | null };
    homeworks?: Array<{
      title?: string;
      commentCount?: number;
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
    body.homeworks?.every(
      (item) =>
        typeof item.commentCount === "number" &&
        Number.isInteger(item.commentCount),
    ),
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

test("/api/homeworks POST 未登录返回 401", async ({ request }) => {
  const now = new Date();
  const response = await request.post("/api/homeworks", {
    data: {
      title: "should fail",
      sectionId: "1",
      publishedAt: now.toISOString(),
      submissionStartAt: now.toISOString(),
      submissionDueAt: new Date(now.getTime() + 86400000).toISOString(),
    },
  });
  expect(response.status()).toBe(401);
});

test("/api/homeworks POST 登录后可创建作业并清理", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const sectionId = await resolveSeedSectionId(page.request);

  const title = `e2e-homework-create-${Date.now()}`;
  const now = new Date();
  const createResponse = await page.request.post("/api/homeworks", {
    data: {
      title,
      sectionId: String(sectionId),
      publishedAt: now.toISOString(),
      submissionStartAt: now.toISOString(),
      submissionDueAt: new Date(now.getTime() + 86400000).toISOString(),
    },
  });
  expect(createResponse.status()).toBe(200);
  const createBody = (await createResponse.json()) as { id?: string };
  expect(createBody.id).toBeTruthy();

  // Verify the created homework appears in the list
  const listResponse = await page.request.get(
    `/api/homeworks?sectionId=${sectionId}`,
  );
  expect(listResponse.status()).toBe(200);
  const listBody = (await listResponse.json()) as {
    homeworks?: Array<{ id?: string; title?: string }>;
  };
  const created = listBody.homeworks?.find((h) => h.title === title);
  expect(created?.id).toBeTruthy();

  // Cleanup
  if (created?.id) {
    await page.request.delete(`/api/homeworks/${created.id}`);
  }
});
