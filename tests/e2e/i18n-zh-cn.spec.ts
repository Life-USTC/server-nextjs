import { expect, type Page, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "./utils/auth";

async function switchToZhCn(page: Page) {
  const response = await page.request.post("/api/locale", {
    data: { locale: "zh-cn" },
  });
  expect(response.status()).toBe(200);

  const cookies = await page.context().cookies();
  const localeCookie = cookies.find((cookie) => cookie.name === "NEXT_LOCALE");
  expect(localeCookie?.value).toBe("zh-cn");
}

test.describe("中文本地化核心场景", () => {
  test.beforeEach(async ({ page }) => {
    await switchToZhCn(page);
  });

  test("登录页展示中文文案", async ({ page }) => {
    await page.goto("/signin");

    await expect(page.getByText("登录").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /使用 USTC 登录/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /调试用户（开发）/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /调试管理员（开发）/ }),
    ).toBeVisible();
  });

  test("公共列表页展示中文标题", async ({ page }) => {
    await page.goto("/sections");
    await expect(page.getByRole("heading", { name: "所有班级" })).toBeVisible();

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "所有课程" })).toBeVisible();

    await page.goto("/teachers");
    await expect(page.getByRole("heading", { name: "所有教师" })).toBeVisible();
  });

  test("普通登录用户在 dashboard 与 settings 中展示中文文案", async ({
    page,
  }) => {
    await signInAsDebugUser(page, "/dashboard", "/dashboard");

    await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();

    await page.goto("/settings/profile");
    await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
    await expect(page.getByText("个人资料").first()).toBeVisible();

    await page.goto("/dashboard/homeworks");
    await expect(page.getByRole("heading", { name: "我的作业" })).toBeVisible();

    const homeworkIndicators = [
      page.getByRole("button", { name: "未完成" }).first(),
      page.getByRole("button", { name: "已完成" }).first(),
      page.getByRole("button", { name: "添加作业" }).first(),
      page.getByText("暂无作业").first(),
      page.getByText("尚未选择班级").first(),
      page.getByText("选择班级后即可在此查看作业").first(),
    ];

    let hasVisibleIndicator = false;
    for (const locator of homeworkIndicators) {
      if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
        hasVisibleIndicator = true;
        break;
      }
    }
    expect(hasVisibleIndicator).toBe(true);
  });

  test("管理员页面展示中文文案", async ({ page }) => {
    await signInAsDevAdmin(page, "/admin", "/admin");

    await expect(page.getByRole("heading", { name: "管理后台" })).toBeVisible();
    await expect(page.getByText("内容审核").first()).toBeVisible();
    await expect(page.getByText("用户管理").first()).toBeVisible();

    await page.goto("/admin/moderation");
    await expect(page.getByRole("heading", { name: "内容审核" })).toBeVisible();
  });

  test("不存在的动态路由展示中文 404 文案", async ({ page }) => {
    await page.goto("/u/non-existing-username");

    await expect(page.locator("h1")).toHaveText("404");
    await expect(page.getByText("页面未找到")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回首页" })).toBeVisible();
  });
});
