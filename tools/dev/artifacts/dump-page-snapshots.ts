import * as path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { DEV_SEED } from "../seed/dev-seed";
import {
  nowIso,
  relativeFromRoot,
  resolveSnapshotRoot,
  sanitizeFileSegment,
  sha256File,
  writeJsonFile,
} from "./artifact-utils";
import { signInForSnapshot } from "./auth";
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
    const body = (await response.json()) as { user?: { id?: string } };
    if (!body.user?.id) throw new Error("Unable to resolve current user id");
    return `/u/id/${body.user.id}`;
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

async function main() {
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";
  const root = resolveSnapshotRoot("pages");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 1100 },
  });

  const entries: Array<Record<string, unknown>> = [];

  try {
    for (const snapshotCase of PAGE_SNAPSHOT_CASES) {
      const page = await context.newPage();
      const startedAt = performance.now();
      try {
        await signInForSnapshot(page, snapshotCase.auth);
        const requestedPath = await resolvePath(page, snapshotCase);
        const response = await page.goto(requestedPath, {
          waitUntil: snapshotCase.waitUntil ?? "domcontentloaded",
        });
        await page.waitForLoadState("networkidle").catch(() => undefined);

        const dir = path.join(root, sanitizeFileSegment(snapshotCase.id));
        const screenshotPath = path.join(dir, "screenshot.png");
        await page.screenshot({ path: screenshotPath, fullPage: true });

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
        await writeJsonFile(
          path.join(
            root,
            sanitizeFileSegment(snapshotCase.id),
            "metadata.json",
          ),
          metadata,
        );
        entries.push(metadata);
        console.error(`page ${snapshotCase.id}: failed`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  await writeJsonFile(path.join(root, "manifest.json"), {
    kind: "pages",
    baseUrl,
    generatedAt: nowIso(),
    count: entries.length,
    entries,
  });
}

await main();
