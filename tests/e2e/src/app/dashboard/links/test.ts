/**
 * E2E tests for the Links Tab (`?tab=links`)
 *
 * ## Data Represented
 * - Dashboard links grouped by category (study, life, tech, classroom, etc.)
 *   sourced from USTC_DASHBOARD_LINKS
 * - Each link card: name, description, visit tracking via
 *   POST /api/dashboard-links/visit
 * - Pin state per user via POST /api/dashboard-links/pin
 *
 * ## UI/UX Elements
 * - Search box to filter links by name/description
 * - Ctrl+K / Cmd+K keyboard shortcut focuses search
 * - Pin/unpin button per card (visible on hover, authenticated only)
 * - Group labels (study, life, tech…) shown in "all" variant
 * - Credit text linking to SmartHypercube/ustclife repo
 *
 * ## Edge Cases
 * - Public view: search works but pin buttons are hidden (allowPinning=false)
 * - Pin/unpin is a stateful action — tests restore original state after toggle
 * - Search filters across all groups; empty search restores full list
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe.configure({ mode: "serial" });

const PIN_LABEL = /^(?:置顶|Pin)$/i;
const UNPIN_LABEL = /^(?:取消置顶|Unpin)$/i;

test.describe("dashboard links", () => {
  test("public ?tab=links shows search and links without pin controls", async ({
    page,
  }, testInfo) => {
    await page.goto("/?tab=links", { waitUntil: "networkidle" });

    const searchInput = page.getByRole("searchbox", {
      name: /搜索网站名称或描述|Search by name or description/i,
    });
    await expect(searchInput).toBeVisible();
    await expect(
      page.getByRole("button", { name: /教务系统/i }).first(),
    ).toBeVisible();

    // No pin forms in public view
    await expect(
      page.locator('form[action="/api/dashboard-links/pin"]').first(),
    ).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "public-dashboard-links-tab");
  });

  test("authenticated can navigate to links tab", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/");

    const linksTab = page.getByRole("link", { name: /网站|Websites/i }).first();
    await expect(linksTab).toBeVisible();
    await linksTab.click();

    await expect(page).toHaveURL(/\/\?tab=links$/);
    await expect(
      page.getByRole("searchbox", {
        name: /搜索网站名称或描述|Search by name or description/i,
      }),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-links-tab");
  });

  test("search filters links", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=links");

    const searchInput = page.getByRole("searchbox", {
      name: /搜索网站名称或描述|Search by name or description/i,
    });
    await expect(searchInput).toBeVisible();

    // Search for a specific link
    await expect(async () => {
      await searchInput.click();
      await searchInput.clear();
      await searchInput.pressSequentially("邮箱");
      await expect(
        page.getByRole("button", { name: /邮箱/i }).first(),
      ).toBeVisible({ timeout: 3_000 });
      await expect(
        page.getByRole("button", { name: /教务系统/i }).first(),
      ).toHaveCount(0);
    }).toPass({
      timeout: 10_000,
      intervals: [250, 500, 1_000],
    });

    await captureStepScreenshot(page, testInfo, "dashboard-links-search");
  });

  test("can pin and unpin a link with state restoration", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=links");

    const locatePinButton = async () => {
      const linkButton = page
        .getByRole("button", { name: /教务系统/i })
        .first();
      await expect(linkButton).toBeVisible();

      const card = linkButton.locator(
        "xpath=ancestor::div[contains(@class, 'group')][1]",
      );
      await card.hover();

      const pinForm = page
        .locator('form[action="/api/dashboard-links/pin"]')
        .filter({
          has: page.locator('input[name="slug"][value="jw"]'),
        })
        .first();
      const pinButton = pinForm
        .getByRole("button", { name: /置顶|Pin|取消置顶|Unpin/i })
        .first();

      await expect(pinButton).toBeVisible();
      return pinButton;
    };

    const pinButton = await locatePinButton();
    const initialLabel = await pinButton.getAttribute("aria-label");
    expect(initialLabel).toMatch(/^(?:置顶|Pin|取消置顶|Unpin)$/i);
    const togglesToPinned = PIN_LABEL.test(initialLabel ?? "");
    const expectedInitialLabel = togglesToPinned ? PIN_LABEL : UNPIN_LABEL;

    // Toggle pin state
    await expect(async () => {
      const currentPinButton = await locatePinButton();
      const currentLabel = await currentPinButton.getAttribute("aria-label");
      if (
        !(togglesToPinned ? UNPIN_LABEL : PIN_LABEL).test(currentLabel ?? "")
      ) {
        await currentPinButton.click({ force: true });
      }
      await expect(await locatePinButton()).toHaveAttribute(
        "aria-label",
        togglesToPinned ? UNPIN_LABEL : PIN_LABEL,
      );
    }).toPass({
      timeout: 10_000,
      intervals: [250, 500, 1_000],
    });
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-links-toggle-request",
    );

    // Restore original state
    const restoreResponse = await page.request.post(
      "/api/dashboard-links/pin",
      {
        form: {
          slug: "jw",
          action: togglesToPinned ? "unpin" : "pin",
          returnTo: "/?tab=links",
        },
        headers: { accept: "application/json" },
      },
    );
    expect(restoreResponse.status()).toBe(200);

    await page.reload({ waitUntil: "networkidle" });
    await expect(await locatePinButton()).toHaveAttribute(
      "aria-label",
      expectedInitialLabel,
    );
  });
});
