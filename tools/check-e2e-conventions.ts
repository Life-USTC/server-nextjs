import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type Violation = {
  file: string;
  rule: string;
  line: number;
};

const repoRoot = process.cwd();
const e2eRoot = join(repoRoot, "tests/e2e");
const violations: Violation[] = [];

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    if (entry.isFile()) {
      return [fullPath];
    }
    return [];
  });
}

function addViolation(file: string, rule: string, line: number) {
  violations.push({
    file: file.replace(`${repoRoot}/`, ""),
    rule,
    line,
  });
}

for (const file of walk(e2eRoot)) {
  if (!/\.(ts|tsx)$/.test(file)) {
    continue;
  }

  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.includes("waitForTimeout(")) {
      addViolation(file, "Do not use waitForTimeout()", lineNumber);
    }
    if (line.includes("test.skip(") || line.includes(".skip(")) {
      addViolation(file, "Do not commit skipped e2e tests", lineNumber);
    }
    if (
      file.endsWith(".ts") &&
      file.includes("/tests/e2e/") &&
      line.includes('from "@/lib/db/prisma"')
    ) {
      addViolation(
        file,
        "Do not import Prisma directly in Playwright tests; use e2e-db.ts",
        lineNumber,
      );
    }
  });
}

if (violations.length > 0) {
  console.error("E2E convention check failed:\n");
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.rule}`);
  }
  process.exit(1);
}

console.log(
  `E2E convention check passed for ${statSync(e2eRoot).isDirectory() ? "tests/e2e" : "unknown"}.`,
);
