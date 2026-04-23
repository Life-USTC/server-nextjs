import * as fs from "node:fs/promises";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

async function collectSourceFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        return [entryPath];
      }
      return [];
    }),
  );

  return files.flat();
}

describe("feature import boundaries", () => {
  it("keeps dashboard feature code independent from the app layer", async () => {
    const featureRoot = path.join(process.cwd(), "src/features");
    const featureFiles = await collectSourceFiles(featureRoot);
    const violations: string[] = [];

    for (const filePath of featureFiles) {
      const source = await fs.readFile(filePath, "utf8");
      if (source.includes('from "@/app/dashboard/')) {
        violations.push(path.relative(process.cwd(), filePath));
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps reusable dashboard business logic out of the app layer", async () => {
    const legacyDashboardRoot = path.join(process.cwd(), "src/app/dashboard");
    const files = await fs
      .stat(legacyDashboardRoot)
      .then(() => collectSourceFiles(legacyDashboardRoot))
      .catch((error: unknown) => {
        if (error && typeof error === "object" && "code" in error) {
          return [];
        }
        throw error;
      });

    expect(files).toEqual([]);
  });
});
