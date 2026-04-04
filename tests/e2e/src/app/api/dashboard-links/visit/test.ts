/**
 * E2E tests for GET & POST /api/dashboard-links/visit
 *
 * ## Endpoints
 * - `GET /api/dashboard-links/visit?slug=X` — Redirect to the dashboard link URL (no side effects)
 * - `POST /api/dashboard-links/visit` — Record a visit click and redirect to the link URL
 *
 * ## GET Request
 * - Query: `{ slug: string }`
 * - 307: redirect to the link's URL
 * - Invalid/missing slug: redirect to /
 *
 * ## POST Request
 * - Form data: `{ slug: string }`
 * - 303: redirect to the link's URL
 * - Records click count for authenticated users (upsert with increment)
 * - Invalid/missing slug: 303 redirect to /
 *
 * ## Auth Requirements
 * - GET: no auth required (pure redirect)
 * - POST: no auth required for redirect, but click is only recorded when authenticated
 *
 * ## Edge Cases
 * - Invalid slug redirects to / instead of erroring
 * - Click recording is best-effort (failures are logged, not surfaced)
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";

const BASE = "/api/dashboard-links/visit";

test.describe("GET & POST /api/dashboard-links/visit", () => {
  test("GET redirects to target link URL", async ({ request }) => {
    const response = await request.get(`${BASE}?slug=jw`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("https://jw.ustc.edu.cn/");
  });

  test("GET with invalid slug redirects to /", async ({ request }) => {
    const response = await request.get(`${BASE}?slug=nonexistent-e2e`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/$/);
  });

  test("GET without slug redirects to /", async ({ request }) => {
    const response = await request.get(BASE, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/$/);
  });

  test("POST with valid slug redirects to target URL", async ({ page }) => {
    await signInAsDebugUser(page, "/");

    const response = await page.request.post(BASE, {
      form: { slug: "jw" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe("https://jw.ustc.edu.cn/");
  });

  test("POST with invalid slug redirects to /", async ({ page }) => {
    await signInAsDebugUser(page, "/");

    const response = await page.request.post(BASE, {
      form: { slug: "nonexistent-e2e" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toMatch(/\/$/);
  });

  test("POST without auth still redirects", async ({ request }) => {
    const response = await request.post(BASE, {
      form: { slug: "jw" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe("https://jw.ustc.edu.cn/");
  });
});
