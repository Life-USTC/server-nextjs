import * as fs from "node:fs/promises";
import * as path from "node:path";
import { writeTextFile } from "./artifact-utils";

type Options = {
  snapshotDir: string;
  artifactUrl: string;
  commit: string;
  output: string;
  screenshotBaseUrl?: string;
  status: string;
  workflowUrl?: string;
};

type SnapshotEntry = {
  id?: unknown;
  kind?: unknown;
  auth?: unknown;
  method?: unknown;
  path?: unknown;
  status?: unknown;
  expectedStatus?: unknown;
  ok?: unknown;
  screenshot?: unknown;
  response?: unknown;
  error?: unknown;
  durationMs?: unknown;
};

type SnapshotManifest = {
  count?: unknown;
  entries?: unknown;
};

const MAX_EMBEDDED_JSON_CHARS = 600;
const SCREENSHOT_WIDTH = 480;

function usage() {
  return [
    "Usage:",
    "  bun run tools/dev/artifacts/render-e2e-snapshot-comment.ts --snapshot-dir <dir> --artifact-url <url> --commit <sha> --status <status> --output <file> [--screenshot-base-url <url>] [--workflow-url <url>]",
  ].join("\n");
}

function readValue(argv: string[], index: number) {
  const value = argv[index + 1];
  if (!value) throw new Error(usage());
  return value;
}

function parseArgs(argv: string[]): Options {
  const options: Partial<Options> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--snapshot-dir") {
      options.snapshotDir = readValue(argv, index);
      index += 1;
    } else if (arg === "--artifact-url") {
      options.artifactUrl = readValue(argv, index);
      index += 1;
    } else if (arg === "--commit") {
      options.commit = readValue(argv, index);
      index += 1;
    } else if (arg === "--status") {
      options.status = readValue(argv, index);
      index += 1;
    } else if (arg === "--output") {
      options.output = readValue(argv, index);
      index += 1;
    } else if (arg === "--screenshot-base-url") {
      options.screenshotBaseUrl = readValue(argv, index);
      index += 1;
    } else if (arg === "--workflow-url") {
      options.workflowUrl = readValue(argv, index);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(usage());
    }
  }

  if (
    !options.snapshotDir ||
    !options.artifactUrl ||
    !options.commit ||
    !options.status ||
    !options.output
  ) {
    throw new Error(usage());
  }

  return {
    snapshotDir: path.resolve(options.snapshotDir),
    artifactUrl: options.artifactUrl,
    commit: options.commit,
    output: path.resolve(options.output),
    screenshotBaseUrl: options.screenshotBaseUrl?.replace(/\/$/, ""),
    status: options.status,
    workflowUrl: options.workflowUrl,
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asEntries(value: SnapshotManifest): SnapshotEntry[] {
  return Array.isArray(value.entries)
    ? value.entries.filter(
        (entry): entry is SnapshotEntry =>
          typeof entry === "object" && entry !== null,
      )
    : [];
}

async function readManifest(filePath: string): Promise<SnapshotManifest> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as SnapshotManifest;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function escapeCell(value: unknown) {
  const text =
    value === undefined || value === null || value === "" ? "-" : String(value);
  return text.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: unknown) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function shortSha(sha: string) {
  return sha.slice(0, 12);
}

function resultCell(entry: SnapshotEntry) {
  if (entry.error) return `failed: ${escapeCell(entry.error)}`;
  if (entry.status !== undefined) {
    const expected = entry.status === entry.expectedStatus;
    if (expected) return `${escapeCell(entry.status)} expected`;
    return `${escapeCell(entry.status)} ${entry.ok === false ? "failed" : "ok"}`;
  }
  return "ok";
}

function entryFailed(entry: SnapshotEntry) {
  if (entry.error) return true;
  if (entry.ok !== false) return false;
  return entry.status !== entry.expectedStatus;
}

function linkToArtifact(label: string, artifactUrl: string, filePath?: string) {
  if (!filePath) return "-";
  return `<a href="${escapeAttribute(artifactUrl)}">${escapeHtml(label)}</a><br><sub>${escapeHtml(filePath)}</sub>`;
}

async function readSnapshotJson(
  snapshotDir: string,
  filePath: string | undefined,
) {
  if (!filePath) return undefined;
  const candidates = [
    path.resolve(filePath),
    path.join(snapshotDir, snapshotRelativePath(filePath)),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        throw error;
      }
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stableJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function responsePreviewJson(entry: SnapshotEntry, json: string | undefined) {
  if (!json) return undefined;

  try {
    const snapshot = JSON.parse(json) as unknown;
    if (entry.kind === "api" && isRecord(snapshot)) {
      const response = snapshot.response;
      if (isRecord(response) && "body" in response) {
        return stableJson(response.body);
      }
    }

    if (entry.kind === "mcp" && isRecord(snapshot)) {
      if ("parsedText" in snapshot) return stableJson(snapshot.parsedText);
      if ("tools" in snapshot) return stableJson({ tools: snapshot.tools });
    }

    return stableJson(snapshot);
  } catch {
    return json;
  }
}

function snapshotRelativePath(filePath: string) {
  return filePath.replace(/^test-results\/e2e-snapshots\//, "");
}

function encodeUrlPath(filePath: string) {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

function screenshotCell(
  entry: SnapshotEntry,
  options: Pick<Options, "artifactUrl" | "screenshotBaseUrl">,
) {
  const filePath = asString(entry.screenshot);
  if (!filePath) return "-";

  if (!options.screenshotBaseUrl) {
    return linkToArtifact("screenshot.png", options.artifactUrl, filePath);
  }

  const screenshotUrl = `${options.screenshotBaseUrl}/${encodeUrlPath(snapshotRelativePath(filePath))}`;
  const label = escapeAttribute(entry.id ?? "screenshot");
  return `<a href="${screenshotUrl}"><img src="${screenshotUrl}" width="${SCREENSHOT_WIDTH}" alt="${label} screenshot"></a>`;
}

function finePrint(items: Array<[string, unknown]>) {
  const content = items
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(([label, value]) => `${label}: ${escapeHtml(value)}`)
    .join(" &middot; ");
  return content ? `<sub>${content}</sub>` : "";
}

function detailsJson(summary: string, json: string | undefined) {
  if (!json) return "<em>No response JSON captured.</em>";
  const trimmed = json.trimEnd();
  const truncated =
    trimmed.length > MAX_EMBEDDED_JSON_CHARS
      ? `${trimmed.slice(0, MAX_EMBEDDED_JSON_CHARS)}\n... truncated ${trimmed.length - MAX_EMBEDDED_JSON_CHARS} chars ...`
      : trimmed;
  return [
    `<details><summary>${escapeHtml(trimmed.length > MAX_EMBEDDED_JSON_CHARS ? `${summary} preview` : summary)}</summary>`,
    "",
    `<pre><code class="language-json">${escapeHtml(truncated)}</code></pre>`,
    "",
    "</details>",
  ].join("\n");
}

function cardTable(cards: string[], emptyText: string) {
  if (cards.length === 0) return [emptyText];

  const lines = ['<table role="presentation">', "<tbody>"];
  for (const card of cards) {
    lines.push("<tr>");
    lines.push(`<td width="100%" valign="top">${card}</td>`);
    lines.push("</tr>");
  }
  lines.push("</tbody>", "</table>");
  return lines;
}

function pageCards(
  entries: SnapshotEntry[],
  options: Pick<Options, "artifactUrl" | "screenshotBaseUrl">,
) {
  return entries.map((entry) => {
    const filePath = asString(entry.screenshot);
    return [
      `<strong>${escapeHtml(entry.id ?? "page")}</strong>`,
      "<br>",
      screenshotCell(entry, options),
      "<br>",
      finePrint([
        ["auth", entry.auth],
        ["result", resultCell(entry)],
        ["duration", entry.durationMs ? `${entry.durationMs}ms` : undefined],
        ["screenshot", filePath],
      ]),
    ].join("");
  });
}

async function responseCards(
  entries: SnapshotEntry[],
  options: Pick<Options, "snapshotDir">,
) {
  return await Promise.all(
    entries.map(async (entry) => {
      const responsePath = asString(entry.response);
      const json = await readSnapshotJson(options.snapshotDir, responsePath);
      const previewJson = responsePreviewJson(entry, json);
      const type = entry.method ?? entry.kind;
      return [
        `<strong>${escapeHtml(entry.id ?? "response")}</strong>`,
        "<br>",
        detailsJson(
          entry.kind === "api" ? "response body" : "tool result",
          previewJson,
        ),
        "<br>",
        finePrint([
          ["type", type],
          ["auth", entry.auth],
          ["result", resultCell(entry)],
          ["duration", entry.durationMs ? `${entry.durationMs}ms` : undefined],
          ["path", entry.path],
          ["artifact path", responsePath],
        ]),
      ].join("");
    }),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [pages, api, mcp] = await Promise.all([
    readManifest(path.join(options.snapshotDir, "pages", "manifest.json")),
    readManifest(path.join(options.snapshotDir, "api", "manifest.json")),
    readManifest(path.join(options.snapshotDir, "mcp", "manifest.json")),
  ]);

  const pageEntries = asEntries(pages);
  const apiEntries = asEntries(api);
  const mcpEntries = asEntries(mcp);
  const failedCount = [...pageEntries, ...apiEntries, ...mcpEntries].filter(
    entryFailed,
  ).length;
  const workflowLink = options.workflowUrl
    ? `Workflow run: [open](${options.workflowUrl})`
    : "Workflow run: -";
  const statusLine =
    failedCount === 0
      ? "Result: snapshot capture completed without failed entries."
      : `Result: snapshot capture recorded ${failedCount} failed entries.`;
  const [apiCards, mcpCards] = await Promise.all([
    responseCards(apiEntries, options),
    responseCards(mcpEntries, options),
  ]);

  const lines = [
    "<!-- life-ustc-e2e-snapshot-artifacts -->",
    `<details><summary>E2E snapshot artifacts for ${shortSha(options.commit)} (${options.status})</summary>`,
    "",
    `Commit: \`${options.commit}\``,
    `Artifact: [e2e-snapshot-artifacts](${options.artifactUrl})`,
    workflowLink,
    statusLine,
    `Captured: ${pageEntries.length} screenshots, ${apiEntries.length} API responses, ${mcpEntries.length} MCP responses.`,
    "",
    "### Screenshots",
    "",
    ...(pageEntries.length > 0
      ? cardTable(
          pageCards(pageEntries, options),
          "No page screenshots were generated.",
        )
      : ["No page screenshots were generated."]),
    "",
    "### API Responses",
    "",
    ...(apiEntries.length > 0
      ? cardTable(apiCards, "No API response snapshots were generated.")
      : ["No API response snapshots were generated."]),
    "",
    "### MCP Responses",
    "",
    ...(mcpEntries.length > 0
      ? cardTable(mcpCards, "No MCP response snapshots were generated.")
      : ["No MCP response snapshots were generated."]),
    "",
    "</details>",
  ];

  await writeTextFile(options.output, lines.join("\n"));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
