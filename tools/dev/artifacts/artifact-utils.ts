import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type SnapshotKind = "pages" | "api" | "mcp";

export function resolveSnapshotRoot(
  kind: SnapshotKind,
  env: NodeJS.ProcessEnv = process.env,
) {
  const base =
    env.E2E_SNAPSHOT_DIR?.trim() ||
    path.join(process.cwd(), "test-results", "e2e-snapshots");
  return path.join(base, kind);
}

export function sanitizeFileSegment(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "_";
  return trimmed
    .replace(/%[0-9A-Fa-f]{2}/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "_");
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeTextFile(filePath: string, value: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith("\n") ? value : `${value}\n`);
}

export async function sha256File(filePath: string) {
  const bytes = await fs.readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export function nowIso() {
  return new Date().toISOString();
}

export function relativeFromRoot(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}
