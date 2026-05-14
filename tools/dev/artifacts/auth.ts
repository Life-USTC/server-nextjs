import type { BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { SnapshotAuth } from "./snapshot-cases";

const DEBUG_LOGIN_BUTTON = /Debug User \(Dev\)|调试用户（开发）/i;
const ADMIN_LOGIN_BUTTON = /Admin User \(Dev\)|调试管理员（开发）/i;

export async function signInForSnapshot(page: Page, auth: SnapshotAuth) {
  if (auth === "public") return;

  await page.goto(`/signin?callbackUrl=${encodeURIComponent("/")}`, {
    waitUntil: "domcontentloaded",
  });
  if (!page.url().includes("/signin")) return;

  const buttonName = auth === "admin" ? ADMIN_LOGIN_BUTTON : DEBUG_LOGIN_BUTTON;
  await page.getByRole("button", { name: buttonName }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });

  const sessionResponse = await page.request.get("/api/auth/get-session");
  expect(sessionResponse.status()).toBe(200);
}

export async function createAuthedPage(
  context: BrowserContext,
  auth: SnapshotAuth,
) {
  const page = await context.newPage();
  await signInForSnapshot(page, auth);
  return page;
}
