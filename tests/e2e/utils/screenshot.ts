import type { Page, TestInfo } from "@playwright/test";

export async function captureStepScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const fileName = `${name.replace(/[^a-zA-Z0-9-_]/g, "-")}.png`;
  const path = testInfo.outputPath(fileName);

  await page.screenshot({
    path,
    fullPage: true,
  });

  await testInfo.attach(name, {
    path,
    contentType: "image/png",
  });
}
