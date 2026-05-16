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
  requestedPath?: unknown;
  pathTemplate?: unknown;
  finalUrl?: unknown;
  status?: unknown;
  expectedStatus?: unknown;
  ok?: unknown;
  screenshot?: unknown;
  response?: unknown;
  error?: unknown;
  durationMs?: unknown;
  title?: unknown;
};

type SnapshotManifest = {
  count?: unknown;
  entries?: unknown;
};

type RouteTreeNode = {
  label: string;
  entries: SnapshotEntry[];
  children: Map<string, RouteTreeNode>;
};

const MAX_EMBEDDED_JSON_CHARS = 600;
const SCREENSHOT_WIDTH = 480;
const IGNORED_PAGE_QUERY_PARAMS = new Set(["snapshotAt"]);
const TREE_BRANCH = "|-- ";
const TREE_LAST = "`-- ";
const TREE_PIPE = "|   ";
const TREE_BLANK = "    ";

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

function pageRoute(entry: SnapshotEntry) {
  const candidates = [entry.finalUrl, entry.requestedPath, entry.pathTemplate];
  for (const candidate of candidates) {
    const value = asString(candidate);
    if (!value) continue;
    try {
      const url = new URL(value, "http://snapshot.local");
      return `${url.pathname}${url.search}`;
    } catch {
      return value;
    }
  }
  return asString(entry.id) ?? "/";
}

function normalizedRoute(
  route: string,
  ignoredParams: Set<string> = new Set(),
) {
  try {
    const url = new URL(route, "http://snapshot.local");
    const params = [...url.searchParams.entries()].filter(
      ([key]) => !ignoredParams.has(key),
    );
    const search =
      params.length > 0
        ? `?${params.map(([key, value]) => `${key}=${value}`).join("&")}`
        : "";
    return `${url.pathname}${search}`;
  } catch {
    return route;
  }
}

function displayRoute(entry: SnapshotEntry) {
  if (entry.kind === "page") {
    return normalizedRoute(pageRoute(entry), IGNORED_PAGE_QUERY_PARAMS);
  }
  if (entry.kind === "mcp") return mcpRoute(entry);
  return normalizedRoute(entryRoute(entry));
}

function treeRoute(entry: SnapshotEntry) {
  if (entry.kind === "mcp") return "/mcp";
  return displayRoute(entry);
}

function entryRoute(entry: SnapshotEntry) {
  if (entry.kind === "page") return pageRoute(entry);
  if (entry.kind === "mcp") return mcpRoute(entry);

  const candidates = [entry.path, entry.requestedPath, entry.pathTemplate];
  for (const candidate of candidates) {
    const value = asString(candidate);
    if (!value) continue;
    try {
      const url = new URL(value, "http://snapshot.local");
      return `${url.pathname}${url.search}`;
    } catch {
      return value;
    }
  }

  return asString(entry.id) ?? "/";
}

function mcpRoute(entry: SnapshotEntry) {
  const id = asString(entry.id) ?? "response";
  return `/mcp/${encodeURIComponent(id)}`;
}

function routeSegments(route: string) {
  let url: URL;
  try {
    url = new URL(route, "http://snapshot.local");
  } catch {
    return [route || "/"];
  }

  const segments = url.pathname.split("/").filter(Boolean);

  const params = [...url.searchParams.entries()];
  if (params.length > 0) {
    segments.push(
      `?${params.map(([key, value]) => `${key}=${value}`).join("&")}`,
    );
  }

  return segments;
}

function compareRouteEntries(a: SnapshotEntry, b: SnapshotEntry) {
  const routeComparison = displayRoute(a).localeCompare(displayRoute(b), "en");
  if (routeComparison !== 0) return routeComparison;
  return String(a.id ?? "").localeCompare(String(b.id ?? ""), "en");
}

function createRouteTreeNode(label: string): RouteTreeNode {
  return { label, entries: [], children: new Map() };
}

function buildRouteTree(entries: SnapshotEntry[]) {
  const root = createRouteTreeNode("/");

  for (const entry of entries) {
    const segments = routeSegments(treeRoute(entry));
    let node = root;
    for (const segment of segments) {
      const existing = node.children.get(segment);
      if (existing) {
        node = existing;
        continue;
      }

      const child = createRouteTreeNode(segment);
      node.children.set(segment, child);
      node = child;
    }
    node.entries.push(entry);
  }

  return root;
}

async function renderRouteTreeNode(
  node: RouteTreeNode,
  renderEntry: (
    entry: SnapshotEntry,
    prefix: string,
    isLast: boolean,
  ) => Promise<string[]>,
  prefix = "",
  connector = "",
  depth = 0,
): Promise<string[]> {
  const lines: string[] = [];
  const entries = [...node.entries].sort(compareRouteEntries);
  const children = [...node.children.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "en"),
  );

  if (depth === 0) {
    lines.push(`<code>${escapeHtml(node.label)}</code><br>`);
  } else {
    lines.push(
      `<code>${escapeHtml(prefix + connector + node.label)}</code><br>`,
    );
  }

  const childPrefix =
    depth === 0
      ? ""
      : prefix + (connector === TREE_LAST ? TREE_BLANK : TREE_PIPE);
  const items: Array<
    | { kind: "entry"; entry: SnapshotEntry }
    | { kind: "node"; node: RouteTreeNode }
  > = [
    ...entries.map((entry) => ({ kind: "entry" as const, entry })),
    ...children.map((child) => ({ kind: "node" as const, node: child })),
  ];

  for (const [index, item] of items.entries()) {
    const isLast = index === items.length - 1;
    const connector = isLast ? TREE_LAST : TREE_BRANCH;
    if (item.kind === "entry") {
      lines.push(...(await renderEntry(item.entry, childPrefix, isLast)));
      continue;
    }
    lines.push(
      ...(await renderRouteTreeNode(
        item.node,
        renderEntry,
        childPrefix,
        connector,
        depth + 1,
      )),
    );
  }

  return lines;
}

function treeLine(prefix: string, isLast: boolean, label: unknown) {
  return `<code>${escapeHtml(prefix + (isLast ? TREE_LAST : TREE_BRANCH) + String(label))}</code>`;
}

function childTreePrefix(prefix: string, isLast: boolean) {
  return prefix + (isLast ? TREE_BLANK : TREE_PIPE);
}

function previewJsonBlock(json: string | undefined) {
  if (!json) return ["<em>No response JSON captured.</em>"];
  const trimmed = json.trimEnd();
  const truncated =
    trimmed.length > MAX_EMBEDDED_JSON_CHARS
      ? `${trimmed.slice(0, MAX_EMBEDDED_JSON_CHARS)}\n... truncated ${trimmed.length - MAX_EMBEDDED_JSON_CHARS} chars ...`
      : trimmed;
  return [
    `<pre><code class="language-json">${escapeHtml(truncated)}</code></pre>`,
  ];
}

function markdownTableCell(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function summaryTable(rows: Array<[string, string]>) {
  const lines = ["| Field | Value |", "| --- | --- |"];
  for (const [field, value] of rows) {
    lines.push(`| ${markdownTableCell(field)} | ${markdownTableCell(value)} |`);
  }
  return lines;
}

function screenshotPanel(
  entry: SnapshotEntry,
  options: Pick<Options, "artifactUrl" | "screenshotBaseUrl">,
) {
  const filePath = asString(entry.screenshot);
  if (!filePath) return "<em>No screenshot captured.</em>";
  return screenshotCell(entry, options);
}

function entryLabel(entry: SnapshotEntry, fallback: string) {
  return asString(entry.id) ?? fallback;
}

function pageMetadata(entry: SnapshotEntry) {
  return finePrint([
    ["uri", displayRoute(entry)],
    ["result", resultCell(entry)],
    ["auth", entry.auth],
    ["title", entry.title],
    ["duration", entry.durationMs ? `${entry.durationMs}ms` : undefined],
  ]);
}

function screenshotTreeLines(
  entry: SnapshotEntry,
  options: Pick<Options, "artifactUrl" | "screenshotBaseUrl">,
  prefix: string,
) {
  const filePath = asString(entry.screenshot);
  const label = filePath ? path.basename(filePath) : "screenshot";

  return [
    `<details><summary>${treeLine(prefix, true, label)}</summary>`,
    "",
    screenshotPanel(entry, options),
    "",
    "</details>",
  ];
}

async function renderPageEntry(
  entry: SnapshotEntry,
  prefix: string,
  isLast: boolean,
  options: Pick<Options, "artifactUrl" | "screenshotBaseUrl">,
) {
  const lines = [
    `${treeLine(prefix, isLast, entryLabel(entry, "page"))} ${pageMetadata(entry)}<br>`,
  ];
  lines.push(
    ...screenshotTreeLines(entry, options, childTreePrefix(prefix, isLast)),
  );
  return lines;
}

function responseMetadata(entry: SnapshotEntry) {
  return finePrint([
    ["uri", displayRoute(entry)],
    ["method", entry.method ?? entry.kind],
    ["result", resultCell(entry)],
    ["auth", entry.auth],
    ["duration", entry.durationMs ? `${entry.durationMs}ms` : undefined],
  ]);
}

async function responseSnapshotTreeLines(
  entry: SnapshotEntry,
  options: Pick<Options, "snapshotDir">,
  prefix: string,
) {
  const responsePath = asString(entry.response);
  const json = await readSnapshotJson(options.snapshotDir, responsePath);
  const previewJson = responsePreviewJson(entry, json);
  const label = responsePath ? path.basename(responsePath) : "response.json";
  const artifact = responsePath
    ? ` <sub><code>${escapeHtml(snapshotRelativePath(responsePath))}</code></sub>`
    : "";
  return [
    `${treeLine(prefix, true, label)}${artifact}<br>`,
    ...previewJsonBlock(previewJson),
  ];
}

async function renderResponseEntry(
  entry: SnapshotEntry,
  prefix: string,
  isLast: boolean,
  options: Pick<Options, "snapshotDir">,
) {
  const lines = [
    `${treeLine(prefix, isLast, entryLabel(entry, "response"))} ${responseMetadata(entry)}<br>`,
  ];
  lines.push(
    ...(await responseSnapshotTreeLines(
      entry,
      options,
      childTreePrefix(prefix, isLast),
    )),
  );
  return lines;
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
  const workflowValue = options.workflowUrl
    ? `[open](${options.workflowUrl})`
    : "-";
  const resultText =
    failedCount === 0
      ? "snapshot capture completed without failed entries."
      : `snapshot capture recorded ${failedCount} failed entries.`;
  const capturedText = [
    `${pageEntries.length} screenshots`,
    `${apiEntries.length} API responses`,
    `${mcpEntries.length} MCP responses`,
  ].join("<br>");
  const [pageTreeLines, apiTreeLines, mcpTreeLines] = await Promise.all([
    renderRouteTreeNode(
      buildRouteTree(pageEntries),
      async (entry, prefix, isLast) =>
        renderPageEntry(entry, prefix, isLast, options),
    ),
    renderRouteTreeNode(
      buildRouteTree(apiEntries),
      async (entry, prefix, isLast) =>
        renderResponseEntry(entry, prefix, isLast, options),
    ),
    renderRouteTreeNode(
      buildRouteTree(mcpEntries),
      async (entry, prefix, isLast) =>
        renderResponseEntry(entry, prefix, isLast, options),
    ),
  ]);

  const lines = [
    "<!-- life-ustc-e2e-snapshot-artifacts -->",
    `## E2E snapshot artifacts for ${shortSha(options.commit)} (${options.status})`,
    "",
    ...summaryTable([
      ["Commit", `\`${options.commit}\``],
      ["Artifact", `[e2e-snapshot-artifacts](${options.artifactUrl})`],
      ["Workflow run", workflowValue],
      ["Result", resultText],
      ["Captured", capturedText],
    ]),
    "",
    "### Screenshots",
    "",
    ...(pageEntries.length > 0
      ? pageTreeLines
      : ["No page screenshots were generated."]),
    "",
    "### API Responses",
    "",
    ...(apiEntries.length > 0
      ? apiTreeLines
      : ["No API response snapshots were generated."]),
    "",
    "### MCP Responses",
    "",
    ...(mcpEntries.length > 0
      ? mcpTreeLines
      : ["No MCP response snapshots were generated."]),
  ];

  await writeTextFile(options.output, lines.join("\n"));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
