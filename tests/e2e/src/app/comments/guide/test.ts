import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";

test("/comments/guide redirects to the canonical markdown guide", async ({
  page,
}) => {
  await gotoAndWaitForReady(page, "/comments/guide", {
    waitUntil: "load",
  });
  await expect(page).toHaveURL(/\/guides\/markdown-support$/);
});
