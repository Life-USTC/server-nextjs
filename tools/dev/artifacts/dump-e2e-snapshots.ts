import { spawn } from "node:child_process";
import * as path from "node:path";
import { nowIso, writeJsonFile } from "./artifact-utils";

const commands = [
  ["pages", "tools/dev/artifacts/dump-page-snapshots.ts"],
  ["api", "tools/dev/artifacts/dump-api-snapshots.ts"],
  ["mcp", "tools/dev/artifacts/dump-mcp-snapshots.ts"],
] as const;

function run(label: string, script: string) {
  return new Promise<Error | undefined>((resolve) => {
    const child = spawn("bun", ["run", script], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else
        resolve(new Error(`${label} snapshot failed with exit code ${code}`));
    });
  });
}

const failures: Error[] = [];
for (const [label, script] of commands) {
  const failure = await run(label, script);
  if (failure) failures.push(failure);
}

const root =
  process.env.E2E_SNAPSHOT_DIR?.trim() ||
  path.join(process.cwd(), "test-results", "e2e-snapshots");
await writeJsonFile(path.join(root, "manifest.json"), {
  kind: "e2e-snapshots",
  generatedAt: nowIso(),
  children: commands.map(([label]) => ({
    kind: label,
    manifest: path.join(label, "manifest.json"),
  })),
});

if (failures.length > 0) {
  throw new Error(failures.map((failure) => failure.message).join("\n"));
}
