import "dotenv/config";

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { importBusStaticPayload } from "../src/features/bus/lib/bus-import";
import type { BusStaticPayload } from "../src/features/bus/lib/bus-types";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaAdapter } from "../src/lib/db/prisma-adapter";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warning: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

function run(cmd: string, cwd?: string) {
  try {
    logger.info(`Running command: ${cmd}`);
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Command failed: ${cmd}\n${err.message}`);
    throw err;
  }
}

async function downloadStaticRepo(targetDir: string): Promise<string> {
  const repoDir = path.join(targetDir, "static");
  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(repoDir) && fs.existsSync(path.join(repoDir, ".git"))) {
    logger.info("Updating existing Life-USTC/static checkout...");
    run(
      "git remote set-url origin https://github.com/Life-USTC/static.git",
      repoDir,
    );
    run("git fetch --depth 1 origin master gh-pages", repoDir);
    run("git checkout -B master || git checkout -B gh-pages", repoDir);
    run(
      "git reset --hard origin/master || git reset --hard origin/gh-pages",
      repoDir,
    );
    run("git sparse-checkout init --cone", repoDir);
    run("git sparse-checkout set static", repoDir);
    run("git checkout", repoDir);
  } else {
    logger.info("Cloning Life-USTC/static (sparse)...");
    fs.mkdirSync(repoDir, { recursive: true });
    run(
      "git clone --no-checkout --depth 1 https://github.com/Life-USTC/static.git .",
      repoDir,
    );
    run("git sparse-checkout init --cone", repoDir);
    run("git sparse-checkout set static", repoDir);
    run("git checkout", repoDir);
  }

  return repoDir;
}

function readBusPayload(repoDir: string, filename: string): BusStaticPayload {
  const filePath = path.join(repoDir, "static", filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Bus data file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as BusStaticPayload;
}

async function main() {
  const cacheDir = process.argv[2] || "./.cache/life-ustc/static-bus";
  const fileName = process.argv[3] || "bus_data_v3.json";
  const versionKey =
    process.argv[4] || `static-${fileName.replace(/\.json$/i, "")}`;
  const versionTitle = process.argv[5] || "Static Bus Timetable";
  const effectiveFromArg = process.argv[6];
  const effectiveUntilArg = process.argv[7];

  try {
    const repoDir = await downloadStaticRepo(cacheDir);
    const payload = readBusPayload(repoDir, fileName);
    const result = await importBusStaticPayload(prisma, payload, {
      versionKey,
      versionTitle,
      effectiveFrom: effectiveFromArg ? new Date(effectiveFromArg) : null,
      effectiveUntil: effectiveUntilArg ? new Date(effectiveUntilArg) : null,
    });

    logger.info(
      `Imported bus data: version=${result.versionKey}, campuses=${result.campuses}, routes=${result.routes}, trips=${result.trips}`,
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
