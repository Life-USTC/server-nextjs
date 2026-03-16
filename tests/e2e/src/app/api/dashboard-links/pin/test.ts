import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";

test("/api/dashboard-links/pin 未登录 JSON 请求返回 401", async ({
  request,
}) => {
  const response = await request.post("/api/dashboard-links/pin", {
    form: {
      slug: "jw",
      action: "pin",
      returnTo: "/?tab=links",
    },
    headers: {
      accept: "application/json",
    },
  });
  expect(response.status()).toBe(401);
});

test("/api/dashboard-links/pin 登录后可 pin/unpin 链接", async ({ page }) => {
  await signInAsDebugUser(page, "/?tab=links");

  const pinResponse = await page.request.post("/api/dashboard-links/pin", {
    form: {
      slug: "jw",
      action: "pin",
      returnTo: "/?tab=links",
    },
    headers: {
      accept: "application/json",
    },
  });
  expect(pinResponse.status()).toBe(200);
  const pinBody = (await pinResponse.json()) as { pinnedSlugs?: string[] };
  expect(pinBody.pinnedSlugs?.includes("jw")).toBe(true);

  const unpinResponse = await page.request.post("/api/dashboard-links/pin", {
    form: {
      slug: "jw",
      action: "unpin",
      returnTo: "/?tab=links",
    },
    headers: {
      accept: "application/json",
    },
  });
  expect(unpinResponse.status()).toBe(200);
  const unpinBody = (await unpinResponse.json()) as { pinnedSlugs?: string[] };
  expect(unpinBody.pinnedSlugs?.includes("jw")).toBe(false);
});
