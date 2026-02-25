import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/auth/[...nextauth]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/auth/[...nextauth]" });
});

test("/api/auth/[...nextauth] 未登录 session 返回空用户", async ({
  request,
}) => {
  const response = await request.get("/api/auth/session");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as { user?: unknown } | null;
  const user =
    body && typeof body === "object" ? (body as { user?: unknown }).user : null;
  expect(user ?? null).toBeNull();
});

test("/api/auth/[...nextauth] 普通用户登录后 session 正确", async ({
  page,
}) => {
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

test("/api/auth/[...nextauth] 管理员登录后 session 标记 admin", async ({
  page,
}) => {
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
