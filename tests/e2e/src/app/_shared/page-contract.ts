import { expect, type Page, type TestInfo } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import {
  gotoAndWaitForReady,
  waitForUiSettled,
} from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

type PageContractCase = {
  routePath: string;
  testInfo?: TestInfo;
};

async function maybeCapture(
  page: Page,
  testInfo: TestInfo | undefined,
  name: string,
) {
  if (!testInfo) {
    return;
  }
  await captureStepScreenshot(page, testInfo, name);
}

async function resolveTeacherId(page: Page): Promise<number> {
  const response = await page.request.get(
    `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}&limit=10`,
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: Array<{ id?: number; nameCn?: string }>;
  };
  const teacher = body.data?.find(
    (item) =>
      typeof item.id === "number" &&
      item.nameCn?.includes(DEV_SEED.teacher.nameCn),
  );
  expect(teacher?.id).toBeDefined();
  return teacher?.id as number;
}

async function resolveSectionId(page: Page): Promise<number> {
  const response = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const section = body.sections?.find(
    (item) =>
      typeof item.id === "number" && item.code === DEV_SEED.section.code,
  );
  expect(section?.id).toBeDefined();
  return section?.id as number;
}

export async function assertPageContract(
  page: Page,
  { routePath, testInfo }: PageContractCase,
) {
  if (routePath === "/sections/[jwId]") {
    const response = await gotoAndWaitForReady(
      page,
      `/sections/${DEV_SEED.section.jwId}`,
    );
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.course.nameCn).first()).toBeVisible();
    await maybeCapture(page, testInfo, "sections-jwId");
    return;
  }

  if (routePath === "/courses/[jwId]") {
    const response = await gotoAndWaitForReady(
      page,
      `/courses/${DEV_SEED.course.jwId}`,
    );
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.course.nameCn).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await maybeCapture(page, testInfo, "courses-jwId");
    return;
  }

  if (routePath === "/teachers/[id]") {
    const teacherId = await resolveTeacherId(page);
    const response = await gotoAndWaitForReady(page, `/teachers/${teacherId}`);
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.teacher.nameCn).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await maybeCapture(page, testInfo, "teachers-id");
    return;
  }

  if (routePath === "/u/[username]") {
    const response = await gotoAndWaitForReady(
      page,
      `/u/${DEV_SEED.debugUsername}`,
    );
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.debugName).first()).toBeVisible();
    await expect(
      page.getByText(`@${DEV_SEED.debugUsername}`).first(),
    ).toBeVisible();
    await maybeCapture(page, testInfo, "u-username");
    return;
  }

  if (routePath === "/u/id/[uid]") {
    await signInAsDebugUser(page, "/");
    const sessionResponse = await page.request.get("/api/auth/session");
    expect(sessionResponse.status()).toBe(200);
    const session = (await sessionResponse.json()) as {
      user?: { id?: string; username?: string | null };
    };
    expect(session.user?.id).toBeTruthy();

    const response = await gotoAndWaitForReady(
      page,
      `/u/id/${session.user?.id}`,
    );
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(
      page.getByText(`@${DEV_SEED.debugUsername}`).first(),
    ).toBeVisible();
    await maybeCapture(page, testInfo, "u-id-uid");
    return;
  }

  if (routePath === "/comments/[id]") {
    await signInAsDebugUser(page);
    const sectionId = await resolveSectionId(page);
    const createResponse = await page.request.post("/api/comments", {
      data: {
        targetType: "section",
        targetId: String(sectionId),
        body: "e2e mapped route comment",
      },
    });
    expect(createResponse.status()).toBe(200);
    const createBody = (await createResponse.json()) as { id?: string };
    expect(createBody.id).toBeTruthy();

    const response = await gotoAndWaitForReady(
      page,
      `/comments/${createBody.id}`,
    );
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    await expect(page).toHaveURL(
      new RegExp(
        `/sections/${DEV_SEED.section.jwId}(?:\\?.*)?#comment-${createBody.id}$`,
      ),
    );
    await expect(page.locator("#main-content")).toBeVisible();
    await maybeCapture(page, testInfo, "comments-id");
    return;
  }

  const response = await gotoAndWaitForReady(page, routePath, {
    waitUntil: routePath === "/api-docs" ? "load" : "networkidle",
  });

  if (response) {
    expect(response.status()).toBeLessThan(500);
  }

  if (routePath === "/signin") {
    await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GitHub/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await maybeCapture(page, testInfo, "signin");
    return;
  }

  if (routePath === "/sections") {
    await gotoAndWaitForReady(
      page,
      `/sections?search=${encodeURIComponent(DEV_SEED.section.code)}`,
    );
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await maybeCapture(page, testInfo, "sections");
    return;
  }

  if (routePath === "/teachers") {
    await gotoAndWaitForReady(
      page,
      `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
    );
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.teacher.nameCn).first()).toBeVisible();
    await maybeCapture(page, testInfo, "teachers");
    return;
  }

  if (routePath === "/courses") {
    await gotoAndWaitForReady(
      page,
      `/courses?search=${encodeURIComponent(DEV_SEED.course.code)}`,
    );
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.course.nameCn).first()).toBeVisible();
    await maybeCapture(page, testInfo, "courses");
    return;
  }

  if (routePath === "/comments/guide") {
    await waitForUiSettled(page);
    await expect(page.locator("pre").first()).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
    await maybeCapture(page, testInfo, "comments-guide");
    return;
  }

  if (routePath === "/") {
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator('a[href="/sections"]').first()).toBeVisible();
    await maybeCapture(page, testInfo, "home");
    return;
  }

  await expect(page.locator("#main-content")).toBeVisible();

  if (routePath === "/api-docs") {
    await waitForUiSettled(page);
    await expect(page.locator("#swagger-ui")).toBeVisible();
    await maybeCapture(page, testInfo, "api-docs");
  }
}
