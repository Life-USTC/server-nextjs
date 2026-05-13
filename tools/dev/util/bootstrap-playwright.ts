import { execSync } from "node:child_process";
import "dotenv/config";

const args = new Set(process.argv.slice(2));

function run(command: string) {
  execSync(command, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
}

if (process.env.npm_lifecycle_event === "test:e2e:bootstrap") {
  console.warn(
    "test:e2e:bootstrap is a compatibility alias; prefer bun run verify:e2e",
  );
}

if (args.has("--minio")) {
  run("bun run dev:minio:e2e");
}

if (args.has("--migrate")) {
  run("bun run prisma:deploy");
}

run("bun run check:e2e");
