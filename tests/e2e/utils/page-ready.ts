import { expect, type Page } from "@playwright/test";

type GotoOptions = {
  expectMainContent?: boolean;
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
};

type LoadStateWaitUntil = Exclude<GotoOptions["waitUntil"], "commit">;

function resolveLoadState(waitUntil: GotoOptions["waitUntil"]) {
  if (waitUntil === "commit") {
    return "domcontentloaded" as const;
  }
  return waitUntil as LoadStateWaitUntil | undefined;
}

export async function waitForUiSettled(
  page: Page,
  options: {
    waitUntil?: LoadStateWaitUntil;
  } = {},
) {
  await page.waitForLoadState(options.waitUntil ?? "networkidle");
  await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
    timeout: 10_000,
  });
}

export async function gotoAndWaitForReady(
  page: Page,
  url: string,
  options: GotoOptions = {},
) {
  const loadStateWaitUntil = resolveLoadState(options.waitUntil);
  const response = await page.goto(url, {
    waitUntil: options.waitUntil ?? "networkidle",
  });

  await waitForUiSettled(page, { waitUntil: loadStateWaitUntil });

  if (options.expectMainContent !== false) {
    await expect(page.locator("#main-content")).toBeVisible();
  }

  return response;
}
