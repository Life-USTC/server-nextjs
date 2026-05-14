import * as path from "node:path";
import { type APIRequestContext, chromium } from "@playwright/test";
import {
  nowIso,
  relativeFromRoot,
  resolveSnapshotRoot,
  sanitizeFileSegment,
  sha256File,
  writeJsonFile,
  writeTextFile,
} from "./artifact-utils";
import { createAuthedPage } from "./auth";
import { API_SNAPSHOT_CASES, type SnapshotAuth } from "./snapshot-cases";

async function requestForAuth(
  requests: Map<SnapshotAuth, APIRequestContext>,
  auth: SnapshotAuth,
) {
  const request = requests.get(auth);
  if (!request) throw new Error(`Missing request context for ${auth}`);
  return request;
}

async function main() {
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";
  const root = resolveSnapshotRoot("api");
  const browser = await chromium.launch();
  const contexts = new Map<
    SnapshotAuth,
    Awaited<ReturnType<typeof browser.newContext>>
  >();
  const requests = new Map<SnapshotAuth, APIRequestContext>();
  const entries: Array<Record<string, unknown>> = [];

  try {
    for (const auth of ["public", "debug", "admin"] as const) {
      const context = await browser.newContext({ baseURL: baseUrl });
      contexts.set(auth, context);
      if (auth !== "public") {
        const page = await createAuthedPage(context, auth);
        await page.close();
      }
      requests.set(auth, context.request);
    }

    for (const snapshotCase of API_SNAPSHOT_CASES) {
      const startedAt = performance.now();
      const dir = path.join(root, sanitizeFileSegment(snapshotCase.id));
      const request = await requestForAuth(requests, snapshotCase.auth);
      try {
        const response =
          snapshotCase.method === "GET"
            ? await request.get(snapshotCase.path, {
                headers: snapshotCase.headers,
              })
            : await request.post(snapshotCase.path, {
                data: snapshotCase.data,
                headers: snapshotCase.headers,
              });
        const contentType = response.headers()["content-type"] ?? "";
        const text = await response.text();
        let body: unknown = text;
        if (contentType.includes("application/json")) {
          body = text ? JSON.parse(text) : null;
        }

        const responsePath = path.join(dir, "response.json");
        await writeJsonFile(responsePath, {
          id: snapshotCase.id,
          request: {
            method: snapshotCase.method,
            path: snapshotCase.path,
            auth: snapshotCase.auth,
            data: snapshotCase.data,
          },
          response: {
            status: response.status(),
            ok: response.ok(),
            headers: response.headers(),
            body,
          },
        });
        if (!contentType.includes("application/json")) {
          await writeTextFile(path.join(dir, "response.txt"), text);
        }

        const metadata = {
          id: snapshotCase.id,
          kind: "api",
          method: snapshotCase.method,
          path: snapshotCase.path,
          auth: snapshotCase.auth,
          status: response.status(),
          ok: response.ok(),
          contentType,
          note: snapshotCase.note,
          durationMs: Math.round(performance.now() - startedAt),
          response: relativeFromRoot(responsePath),
          responseSha256: await sha256File(responsePath),
        };
        await writeJsonFile(path.join(dir, "metadata.json"), metadata);
        entries.push(metadata);
        console.log(`api ${snapshotCase.id}: ${metadata.status}`);
      } catch (error) {
        const metadata = {
          id: snapshotCase.id,
          kind: "api",
          method: snapshotCase.method,
          path: snapshotCase.path,
          auth: snapshotCase.auth,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Math.round(performance.now() - startedAt),
        };
        await writeJsonFile(path.join(dir, "metadata.json"), metadata);
        entries.push(metadata);
        console.error(`api ${snapshotCase.id}: failed`);
      }
    }
  } finally {
    for (const context of contexts.values()) {
      await context.close();
    }
    await browser.close();
  }

  await writeJsonFile(path.join(root, "manifest.json"), {
    kind: "api",
    baseUrl,
    generatedAt: nowIso(),
    count: entries.length,
    entries,
  });
}

await main();
