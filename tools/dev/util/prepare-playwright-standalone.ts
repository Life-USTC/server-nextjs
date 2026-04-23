import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const standaloneRoot = path.join(root, ".next", "standalone");
const standaloneNextRoot = path.join(standaloneRoot, ".next");
const sourceStaticRoot = path.join(root, ".next", "static");
const targetStaticRoot = path.join(standaloneNextRoot, "static");
const sourcePublicRoot = path.join(root, "public");
const targetPublicRoot = path.join(standaloneRoot, "public");

function replaceDirectory(source: string, target: string) {
  fs.rmSync(target, { recursive: true, force: true });
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

if (!fs.existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error(
    "Missing .next/standalone/server.js. Run `bun run build` before preparing the Playwright standalone server.",
  );
}

replaceDirectory(sourceStaticRoot, targetStaticRoot);
replaceDirectory(sourcePublicRoot, targetPublicRoot);
