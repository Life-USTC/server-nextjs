import * as fs from "node:fs/promises";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { prismaVersion } from "@/generated/prisma/internal/prismaNamespace";

describe("Prisma toolchain versions", () => {
  it("keeps the generated Prisma client aligned with package.json", async () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(
      await fs.readFile(packageJsonPath, "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJson.dependencies["@prisma/adapter-pg"]).toBe(
      prismaVersion.client,
    );
    expect(packageJson.dependencies["@prisma/client"]).toBe(
      prismaVersion.client,
    );
    expect(packageJson.devDependencies.prisma).toBe(prismaVersion.client);
  });
});
