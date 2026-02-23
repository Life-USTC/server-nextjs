import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "./utils/auth";

test("未登录访问 session 接口返回空用户", async ({ request }) => {
  const response = await request.get("/api/auth/session");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as { user?: unknown } | null;
  const user =
    body && typeof body === "object" ? (body as { user?: unknown }).user : null;
  expect(user ?? null).toBeNull();
});

test("登录后可访问需要登录的 API", async ({ page }) => {
  await signInAsDebugUser(page);

  const response = await page.request.get("/api/uploads");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as Record<string, unknown>;
  expect(typeof body.maxFileSizeBytes).toBe("number");
  expect(typeof body.quotaBytes).toBe("number");
  expect(typeof body.usedBytes).toBe("number");
  expect(Array.isArray(body.uploads)).toBe(true);
});

test("登录后 session 接口返回用户信息", async ({ page }) => {
  await signInAsDebugUser(page);

  const response = await page.request.get("/api/auth/session");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    user?: { id?: string; username?: string | null; isAdmin?: boolean };
  };
  expect(typeof body.user?.id).toBe("string");
  expect(typeof body.user?.username).toBe("string");
  expect(body.user?.isAdmin).toBe(false);
});

test("普通登录用户访问 admin API 返回 401", async ({ page }) => {
  await signInAsDebugUser(page);

  const response = await page.request.get("/api/admin/users");
  expect(response.status()).toBe(401);

  const body = (await response.json()) as { error?: unknown };
  expect(typeof body.error).toBe("string");
});

test("管理员登录用户可访问 admin API", async ({ page }) => {
  await signInAsDevAdmin(page);

  const [usersResponse, commentsResponse, suspensionsResponse] =
    await Promise.all([
      page.request.get("/api/admin/users"),
      page.request.get("/api/admin/comments"),
      page.request.get("/api/admin/suspensions"),
    ]);

  expect(usersResponse.status()).toBe(200);
  expect(commentsResponse.status()).toBe(200);
  expect(suspensionsResponse.status()).toBe(200);

  const usersBody = (await usersResponse.json()) as {
    data?: unknown;
    pagination?: unknown;
  };
  expect(Array.isArray(usersBody.data)).toBe(true);
  expect(typeof usersBody.pagination).toBe("object");

  const commentsBody = (await commentsResponse.json()) as {
    comments?: unknown;
  };
  expect(Array.isArray(commentsBody.comments)).toBe(true);

  const suspensionsBody = (await suspensionsResponse.json()) as {
    suspensions?: unknown;
  };
  expect(Array.isArray(suspensionsBody.suspensions)).toBe(true);
});

test("管理员登录后 session 标记为 admin", async ({ page }) => {
  await signInAsDevAdmin(page);

  const response = await page.request.get("/api/auth/session");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    user?: { id?: string; username?: string | null; isAdmin?: boolean };
  };
  expect(typeof body.user?.id).toBe("string");
  expect(typeof body.user?.username).toBe("string");
  expect(body.user?.isAdmin).toBe(true);
});

test("登录后可通过 auth signout 清空会话", async ({ page }) => {
  await signInAsDebugUser(page);

  const beforeResponse = await page.request.get("/api/auth/session");
  expect(beforeResponse.status()).toBe(200);
  const beforeBody = (await beforeResponse.json()) as {
    user?: { id?: string };
  };
  expect(typeof beforeBody.user?.id).toBe("string");

  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.status()).toBe(200);
  const csrfBody = (await csrfResponse.json()) as { csrfToken?: string };
  expect(typeof csrfBody.csrfToken).toBe("string");

  const signoutResponse = await page.request.post("/api/auth/signout", {
    form: {
      csrfToken: csrfBody.csrfToken ?? "",
      callbackUrl: "/",
      json: "true",
    },
  });
  expect(signoutResponse.status()).toBe(200);

  const afterResponse = await page.request.get("/api/auth/session");
  expect(afterResponse.status()).toBe(200);
  const afterBody = (await afterResponse.json()) as { user?: unknown } | null;
  const user =
    afterBody && typeof afterBody === "object"
      ? (afterBody as { user?: unknown }).user
      : null;
  expect(user ?? null).toBeNull();
});

test("登录后 comments API 在有 section 数据时可完成创建更新删除链路", async ({
  page,
}) => {
  await signInAsDebugUser(page);

  const sectionsResponse = await page.request.get("/api/sections?limit=1");
  expect(sectionsResponse.status()).toBe(200);
  const sectionsBody = (await sectionsResponse.json()) as {
    data?: Array<{ id?: number }>;
  };
  const sectionId = sectionsBody.data?.find(
    (entry) => typeof entry.id === "number",
  )?.id;

  if (!sectionId) {
    const fallbackResponse = await page.request.post("/api/comments", {
      data: {
        targetType: "section",
        targetId: "abc",
        body: "playwright e2e fallback",
      },
    });
    expect(fallbackResponse.status()).toBe(400);
    return;
  }

  const createResponse = await page.request.post("/api/comments", {
    data: {
      targetType: "section",
      targetId: String(sectionId),
      body: "playwright e2e api auth create",
    },
  });
  expect(createResponse.status()).toBe(200);
  const created = (await createResponse.json()) as { id?: string };
  expect(typeof created.id).toBe("string");

  const getResponse = await page.request.get(`/api/comments/${created.id}`);
  expect(getResponse.status()).toBe(200);
  const getBody = (await getResponse.json()) as { focusId?: string };
  expect(getBody.focusId).toBe(created.id);

  const patchResponse = await page.request.patch(
    `/api/comments/${created.id}`,
    {
      data: {
        body: "playwright e2e api auth updated",
      },
    },
  );
  expect(patchResponse.status()).toBe(200);
  const patchBody = (await patchResponse.json()) as {
    success?: boolean;
    comment?: { body?: string };
  };
  expect(patchBody.success).toBe(true);
  expect(patchBody.comment?.body).toContain("updated");

  const deleteResponse = await page.request.delete(
    `/api/comments/${created.id}`,
  );
  expect(deleteResponse.status()).toBe(200);
  const deleteBody = (await deleteResponse.json()) as { success?: boolean };
  expect(deleteBody.success).toBe(true);
});
