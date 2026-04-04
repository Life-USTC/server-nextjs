import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/admin/bus shows version table", async ({ page }, testInfo) => {
  await signInAsDevAdmin(page, "/admin/bus");

  // Stats section visible
  await expect(page.getByText(/Versions|时刻表版本/).first()).toBeVisible();

  // Version table should have at least one row (from seed data)
  await expect(
    page.getByText(/dev-scenario-bus|DEV 校车/).first(),
  ).toBeVisible();

  await captureStepScreenshot(page, testInfo, "admin-bus-versions");
});

test("/admin/bus card visible on admin home", async ({ page }, testInfo) => {
  await signInAsDevAdmin(page, "/admin");

  const busCard = page.getByRole("link", {
    name: /校车管理|Shuttle Bus/i,
  });
  await expect(busCard).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/admin\/bus(?:\?.*)?$/),
    busCard.click(),
  ]);
  await captureStepScreenshot(page, testInfo, "admin-bus-navigate");
});
