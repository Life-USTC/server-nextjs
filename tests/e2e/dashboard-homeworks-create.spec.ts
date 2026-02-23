import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "./utils/auth";

test("dashboard 作业页可直接新建作业", async ({ page }) => {
  await signInAsDebugUser(page, "/dashboard/homeworks");

  await page.goto("/dashboard/homeworks");
  await page.getByTestId("dashboard-homeworks-add").first().click();

  const title = `e2e-dashboard-homework-${Date.now()}`;
  await page.getByTestId("dashboard-homework-title").fill(title);
  await page.getByTestId("dashboard-homework-create").click();

  await expect(page.getByText(title).first()).toBeVisible();
});
