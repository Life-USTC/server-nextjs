import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const cliPath = path.join(
  process.cwd(),
  "node_modules",
  "semantic-release",
  "bin",
  "semantic-release.js",
);

if (!existsSync(cliPath)) {
  throw new Error(
    "semantic-release is not installed. Run bun install --frozen-lockfile.",
  );
}

const result = spawnSync(process.execPath, [cliPath], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
