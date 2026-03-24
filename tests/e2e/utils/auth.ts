import { expect, type Page } from "@playwright/test";
import { gotoAndWaitForReady, waitForUiSettled } from "./page-ready";

const DEV_DEBUG_LOGIN_BUTTON = /Debug User \(Dev\)|调试用户（开发）/i;
const DEV_ADMIN_LOGIN_BUTTON = /Admin User \(Dev\)|调试管理员（开发）/i;
const SESSION_RETRY_ATTEMPTS = 5;

const ROUTE_ALIASES = new Map<string, string>([
  ["/settings/accounts", "/settings?tab=accounts"],
  ["/settings/content", "/settings?tab=content"],
  ["/settings/danger", "/settings?tab=danger"],
  ["/settings/profile", "/settings?tab=profile"],
  ["/settings/comments", "/"],
  ["/settings/uploads", "/"],
]);

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveExpectedPath(path: string) {
  return ROUTE_ALIASES.get(path) ?? path;
}

export async function expectPagePath(page: Page, path: string) {
  const alias = ROUTE_ALIASES.get(path);
  const candidates = Array.from(
    new Set([path, alias].filter(Boolean)),
  ) as string[];
  const pattern = candidates
    .map((candidate) =>
      candidate === "/" ? "\\/$" : escapeForRegExp(candidate),
    )
    .join("|");
  await expect(page).toHaveURL(new RegExp(`(?:${pattern})$`));
}

type SignInProvider = "ustc" | "github" | "google";

const SIGN_IN_PROVIDER_LABELS: Record<SignInProvider, RegExp> = {
  ustc: /USTC/i,
  github: /GitHub/i,
  google: /Google/i,
};

async function expectAuthenticatedSession(
  page: Page,
  options: { isAdmin?: boolean } = {},
) {
  await expect(async () => {
    const sessionResponse = await page.request.get("/api/auth/session");
    expect(sessionResponse.status()).toBe(200);
    const session = (await sessionResponse.json()) as {
      user?: { id?: string; isAdmin?: boolean };
    };

    expect(typeof session.user?.id).toBe("string");
    if (options.isAdmin) {
      expect(session.user?.isAdmin).toBe(true);
    }
  }).toPass({
    intervals: Array.from(
      { length: SESSION_RETRY_ATTEMPTS - 1 },
      (_, index) => 250 * (index + 1),
    ),
    timeout: 5_000,
  });
}

export async function expectRequiresSignIn(
  page: Page,
  path: string,
  options: {
    providers?: SignInProvider[];
  } = {},
) {
  await gotoAndWaitForReady(page, path, {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  for (const provider of options.providers ?? ["ustc"]) {
    await expect(
      page.getByRole("button", { name: SIGN_IN_PROVIDER_LABELS[provider] }),
    ).toBeVisible();
  }
}

export async function signInAsDebugUser(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await gotoAndWaitForReady(
    page,
    `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`,
  );
  const debugButton = page
    .getByRole("button", { name: DEV_DEBUG_LOGIN_BUTTON })
    .first();
  await expect(debugButton).toBeVisible();
  await debugButton.click();

  await expect(async () => {
    await expectPagePath(page, expectedPath);
  }).toPass({
    intervals: Array.from(
      { length: SESSION_RETRY_ATTEMPTS - 1 },
      (_, index) => 250 * (index + 1),
    ),
    timeout: 10_000,
  });
  await waitForUiSettled(page);
  await expect(page.locator("#main-content")).toBeVisible();
  await expectAuthenticatedSession(page);
}

export async function signInAsDevAdmin(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await gotoAndWaitForReady(
    page,
    `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`,
  );
  const adminButton = page
    .getByRole("button", { name: DEV_ADMIN_LOGIN_BUTTON })
    .first();
  await expect(adminButton).toBeVisible();
  await adminButton.click();

  await expect(async () => {
    await expectPagePath(page, expectedPath);
  }).toPass({
    intervals: Array.from(
      { length: SESSION_RETRY_ATTEMPTS - 1 },
      (_, index) => 250 * (index + 1),
    ),
    timeout: 10_000,
  });
  await waitForUiSettled(page);
  await expect(page.locator("#main-content")).toBeVisible();
  await expectAuthenticatedSession(page, { isAdmin: true });
}
