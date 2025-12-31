import "dotenv/config";

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { loadExams } from "./load-exams";
import { loadSchedules } from "./load-schedules";
import { loadSections } from "./load-sections";
import { loadSemesters } from "./load-semesters";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warning: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

async function run(cmd: string, cwd?: string) {
  try {
    logger.info(`Running command: ${cmd}`);
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Command failed: ${cmd}\n${err.message}`);
    throw new Error(`Command failed: ${cmd}\n${err.message}`);
  }
}

async function downloadStaticCache(targetDir: string): Promise<string> {
  /**
   * Ensure Life-USTC/static@gh-pages is present and updated, sparse-checkout 'cache'.
   * Returns path to cache directory.
   */
  const repoDir = path.join(targetDir, "static");
  const cacheDir = path.join(repoDir, "cache");

  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(repoDir) && fs.existsSync(path.join(repoDir, ".git"))) {
    logger.info("Updating existing static cache...");
    run(
      "git remote set-url origin https://github.com/Life-USTC/static.git",
      repoDir,
    );
    run("git fetch --depth 1 origin gh-pages", repoDir);
    run("git checkout -B gh-pages", repoDir);
    run("git reset --hard origin/gh-pages", repoDir);
    run("git sparse-checkout init --cone", repoDir);
    run("git sparse-checkout set cache", repoDir);
    run("git checkout", repoDir);
  } else {
    logger.info("Cloning Life-USTC/static...");
    fs.mkdirSync(repoDir, { recursive: true });
    run(
      "git clone --no-checkout --depth 1 --branch gh-pages https://github.com/Life-USTC/static.git .",
      repoDir,
    );
    run("git sparse-checkout init --cone", repoDir);
    run("git sparse-checkout set cache", repoDir);
    run("git checkout", repoDir);
  }

  return cacheDir;
}

async function main() {
  const cacheDir = process.argv[2] || "./.cache/life-ustc/static";
  const minSemesterCode = Number.parseInt(process.argv[3] || "401", 10);

  try {
    logger.info(`Starting data load (min semester code: ${minSemesterCode})`);
    logger.info("Downloading static cache...");
    const cacheRoot = await downloadStaticCache(cacheDir);
    logger.info(`Static cache at: ${cacheRoot}`);
    logger.info("Loading semesters...");
    const filePath = path.join(
      cacheRoot,
      "catalog",
      "api",
      "teach",
      "semester",
      "list.json",
    );
    const semesterData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const semesters = await loadSemesters(semesterData, prisma)
      .then((semesters) => semesters.sort((a, b) => b.jwId - a.jwId))
      .then((semesters) =>
        semesters.filter((s) => Number.parseInt(s.code, 10) >= minSemesterCode),
      );

    logger.info(
      `Filtered to ${semesters.length} semesters (code >= ${minSemesterCode})`,
    );

    if (semesters.length === 0) {
      logger.error("No semesters loaded. Aborting.");
      process.exit(1);
    }

    for (const semester of semesters) {
      logger.info(`Processing semester: ${semester.nameCn} (${semester.code})`);

      const filePath = path.join(
        cacheRoot,
        "catalog",
        "api",
        "teach",
        "lesson",
        "list-for-teach",
        `${semester.jwId}.json`,
      );

      if (!fs.existsSync(filePath)) {
        logger.warning(
          `Sections list not found for semester ${semester.id} in ${filePath}`,
        );
        continue;
      }

      const sectionData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const sections = await loadSections(sectionData, prisma, semester.id);

      // Load exams for this semester
      logger.info(
        `Loading exams for semester: ${semester.nameCn} (${semester.code})`,
      );
      const examFilePath = path.join(
        cacheRoot,
        "catalog",
        "api",
        "teach",
        "exam",
        "list",
        `${semester.jwId}.json`,
      );

      if (fs.existsSync(examFilePath)) {
        const examData = JSON.parse(fs.readFileSync(examFilePath, "utf-8"));
        const exams = await loadExams(examData, prisma);
        logger.info(
          `Loaded ${exams.length} exams for semester ${semester.nameCn}`,
        );
      } else {
        logger.warning(
          `Exam data not found for semester ${semester.id} in ${examFilePath}`,
        );
      }

      for (const section of sections) {
        logger.info(
          `Loading schedules for section: ${section.jwId} (${section.code})`,
        );
        const scheduleFilePath = path.join(
          cacheRoot,
          "jw",
          "ws",
          "schedule-table",
          "datum",
          `${section.jwId}.json`,
        );

        if (!fs.existsSync(scheduleFilePath)) {
          logger.warning(
            `Schedule data not found for section ${section.jwId} in ${scheduleFilePath}`,
          );
          continue;
        }

        const scheduleData = JSON.parse(
          fs.readFileSync(scheduleFilePath, "utf-8"),
        );
        await loadSchedules(scheduleData, section, prisma);
      }
    }

    logger.info("Data load complete!");
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Fatal error: ${err.message}`);
    if (err.stack) {
      logger.error(`Stack trace: ${err.stack}`);
    }
    logger.error(
      `Error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
