/**
 * E2E tests for /guides/markdown-support page
 *
 * Static documentation page showcasing Markdown features supported in comments.
 */
import { expect, test } from "@playwright/test";
import {
  gotoAndWaitForReady,
  waitForUiSettled,
} from "../../../../utils/page-ready";
import { assertPageContract } from "../../_shared/page-contract";

test.describe("/guides/markdown-support", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, {
      routePath: "/guides/markdown-support",
      testInfo,
    });
  });

  test("renders markdown guide with code blocks and tables", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/guides/markdown-support", {
      waitUntil: "load",
    });
    await waitForUiSettled(page);

    await expect(page.locator("#main-content")).toBeVisible();

    // Should contain code examples
    await expect(page.locator("pre").first()).toBeVisible();

    // Should contain a table
    await expect(page.locator("table").first()).toBeVisible();
  });
});
