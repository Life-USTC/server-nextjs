import * as path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import { DEV_SEED } from "../seed/dev-seed";
import {
  assertNoSnapshotErrors,
  nowIso,
  relativeFromRoot,
  resetDirectory,
  resolveSnapshotRoot,
  sanitizeFileSegment,
  sha256File,
  writeJsonFile,
} from "./artifact-utils";
import { signInForSnapshot } from "./auth";
import {
  cleanupSnapshotOAuthClients,
  disconnectSnapshotOAuthCleanup,
} from "./oauth-cleanup";
import { PAGE_SNAPSHOT_CASES, type PageSnapshotCase } from "./snapshot-cases";

async function resolvePath(page: Page, snapshotCase: PageSnapshotCase) {
  if (!snapshotCase.resolvePath) return snapshotCase.path;

  if (snapshotCase.resolvePath === "teacher-detail") {
    const response = await page.request.get(
      `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.code)}&limit=5`,
    );
    const body = (await response.json()) as {
      data?: Array<{ id?: number; code?: string | null }>;
    };
    const teacherId = body.data?.find(
      (item) => item.code === DEV_SEED.teacher.code,
    )?.id;
    if (!teacherId) throw new Error("Unable to resolve seed teacher id");
    return `/teachers/${teacherId}`;
  }

  if (snapshotCase.resolvePath === "user-id") {
    const response = await page.request.get("/api/me");
    const body = (await response.json()) as { id?: string };
    if (!body.id) throw new Error("Unable to resolve current user id");
    return `/u/id/${body.id}`;
  }

  const sectionResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  const sectionBody = (await sectionResponse.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const sectionId = sectionBody.sections?.find(
    (section) => section.code === DEV_SEED.section.code,
  )?.id;
  if (!sectionId) throw new Error("Unable to resolve seed section id");

  const commentResponse = await page.request.get(
    `/api/comments?targetType=section&targetId=${sectionId}`,
  );
  const commentBody = (await commentResponse.json()) as {
    comments?: Array<{ id?: string; body?: string }>;
  };
  const commentId = commentBody.comments?.find((comment) =>
    comment.body?.includes(DEV_SEED.comments.sectionRootBody),
  )?.id;
  if (!commentId) throw new Error("Unable to resolve seed comment id");
  return `/comments/${commentId}`;
}

async function waitForSnapshotReady(page: Page) {
  await page
    .waitForLoadState("networkidle", { timeout: 2_000 })
    .catch(() => undefined);
  await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.getByText(/加载中|Loading/i)).toHaveCount(0, {
    timeout: 10_000,
  });
}

async function gotoSnapshotPage(
  page: Page,
  snapshotCase: PageSnapshotCase,
  requestedPath: string,
) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await page.goto(requestedPath, {
        waitUntil: snapshotCase.waitUntil ?? "domcontentloaded",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        snapshotCase.auth === "public" ||
        attempt === 2 ||
        !message.includes("/signin")
      ) {
        throw error;
      }
      await signInForSnapshot(page, snapshotCase.auth, requestedPath);
    }
  }
  throw new Error(`Unable to navigate to ${requestedPath}`);
}

async function main() {
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";
  const root = resolveSnapshotRoot("pages");
  await cleanupSnapshotOAuthClients();
  const browser = await chromium.launch();

  const entries: Array<Record<string, unknown>> = [];
  await resetDirectory(root);

  try {
    for (const snapshotCase of PAGE_SNAPSHOT_CASES) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        deviceScaleFactor: 2,
        viewport: { width: 1440, height: 1100 },
      });
      const page = await context.newPage();
      const startedAt = performance.now();
      const dir = path.join(root, sanitizeFileSegment(snapshotCase.id));
      await resetDirectory(dir);
      try {
        await signInForSnapshot(
          page,
          snapshotCase.auth,
          snapshotCase.resolvePath ? "/" : snapshotCase.path,
        );
        const requestedPath = await resolvePath(page, snapshotCase);
        const response = await gotoSnapshotPage(
          page,
          snapshotCase,
          requestedPath,
        );
        await waitForSnapshotReady(page);

        const screenshotPath = path.join(dir, "screenshot.png");
        await page.screenshot({
          path: screenshotPath,
          fullPage: snapshotCase.fullPage ?? true,
        });

        const metadata = {
          id: snapshotCase.id,
          kind: "page",
          auth: snapshotCase.auth,
          requestedPath,
          pathTemplate: snapshotCase.path,
          finalUrl: page.url(),
          status: response?.status() ?? null,
          ok: response?.ok() ?? null,
          title: await page.title(),
          note: snapshotCase.note,
          durationMs: Math.round(performance.now() - startedAt),
          screenshot: relativeFromRoot(screenshotPath),
          screenshotSha256: await sha256File(screenshotPath),
        };
        await writeJsonFile(path.join(dir, "metadata.json"), metadata);
        entries.push(metadata);
        console.log(`page ${snapshotCase.id}: ${metadata.status}`);
      } catch (error) {
        const metadata = {
          id: snapshotCase.id,
          kind: "page",
          auth: snapshotCase.auth,
          requestedPath: snapshotCase.path,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Math.round(performance.now() - startedAt),
        };
        await writeJsonFile(path.join(dir, "metadata.json"), metadata);
        entries.push(metadata);
        console.error(`page ${snapshotCase.id}: failed`);
      } finally {
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await disconnectSnapshotOAuthCleanup();
  }

  await writeJsonFile(path.join(root, "manifest.json"), {
    kind: "pages",
    baseUrl,
    generatedAt: nowIso(),
    count: entries.length,
    entries,
  });
  assertNoSnapshotErrors("pages", entries);
}

await main();
