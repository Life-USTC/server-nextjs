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

function escapeAttribute(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function shortSha(sha: string) {
  return sha.slice(0, 12);
}

function resultCell(entry: SnapshotEntry) {
  if (entry.error) return `failed: ${escapeCell(entry.error)}`;
  if (entry.status !== undefined) {
    return `${escapeCell(entry.status)} ${entry.ok === false ? "failed" : "ok"}`;
  }
  return "ok";
}

function linkToArtifact(label: string, artifactUrl: string, filePath?: string) {
  if (!filePath) return "-";
  return `[${label}](${artifactUrl})<br><sub>${escapeCell(filePath)}</sub>`;
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
  return [
    `<a href="${screenshotUrl}"><img src="${screenshotUrl}" width="320" alt="${label} screenshot"></a>`,
    `<br><sub>[artifact bundle](${options.artifactUrl}) · ${escapeCell(filePath)}</sub>`,
  ].join("");
}

function pageRows(
  entries: SnapshotEntry[],
  options: Pick<Options, "artifactUrl" | "screenshotBaseUrl">,
) {
  const rows = entries.map((entry) =>
    [
      escapeCell(entry.id),
      escapeCell(entry.auth),
      resultCell(entry),
      screenshotCell(entry, options),
      escapeCell(entry.durationMs),
    ].join(" | "),
  );
  return [
    "| Page | Auth | Result | Screenshot | Duration ms |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ];
}

function responseRows(entries: SnapshotEntry[], artifactUrl: string) {
  const rows = entries.map((entry) =>
    [
      escapeCell(entry.id),
      escapeCell(entry.method ?? entry.kind),
      escapeCell(entry.auth),
      resultCell(entry),
      linkToArtifact("response.json", artifactUrl, asString(entry.response)),
      escapeCell(entry.durationMs),
    ].join(" | "),
  );
  return [
    "| Case | Type | Auth | Result | JSON | Duration ms |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
  ];
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
    (entry) => entry.error || entry.ok === false,
  ).length;
  const workflowLink = options.workflowUrl
    ? `Workflow run: [open](${options.workflowUrl})`
    : "Workflow run: -";

  const lines = [
    "<!-- life-ustc-e2e-snapshot-artifacts -->",
    `<details><summary>E2E snapshot artifacts for ${shortSha(options.commit)} (${options.status})</summary>`,
    "",
    `Commit: \`${options.commit}\``,
    `Artifact: [e2e-snapshot-artifacts](${options.artifactUrl})`,
    workflowLink,
    `Summary: ${pageEntries.length} screenshots, ${apiEntries.length} API responses, ${mcpEntries.length} MCP responses, ${failedCount} failed entries.`,
    "",
    "### Screenshots",
    "",
    ...(pageEntries.length > 0
      ? pageRows(pageEntries, options)
      : ["No page screenshots were generated."]),
    "",
    "### API Responses",
    "",
    ...(apiEntries.length > 0
      ? responseRows(apiEntries, options.artifactUrl)
      : ["No API response snapshots were generated."]),
    "",
    "### MCP Responses",
    "",
    ...(mcpEntries.length > 0
      ? responseRows(mcpEntries, options.artifactUrl)
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
