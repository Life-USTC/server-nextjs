import "dotenv/config";

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { importBusStaticPayload } from "../src/features/bus/lib/bus-import";
import type { BusStaticPayload } from "../src/features/bus/lib/bus-types";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaAdapter } from "../src/lib/db/prisma-adapter";
import { loadExams } from "./load-exams";
import { loadSchedules } from "./load-schedules";
import { loadSections } from "./load-sections";
import { loadSemesters } from "./load-semesters";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warning: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

function run(cmd: string, cwd?: string) {
  try {
    logger.info(`Running command: ${cmd}`);
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Command failed: ${cmd}\n${err.message}`);
    throw new Error(`Command failed: ${cmd}\n${err.message}`);
  }
}

/**
 * Clone or update Life-USTC/static@gh-pages with sparse-checkout for both
 * `cache` (course/exam data) and `static` (bus data).
 */
function downloadStaticRepo(targetDir: string): string {
  const repoDir = path.join(targetDir, "static");
  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(repoDir) && fs.existsSync(path.join(repoDir, ".git"))) {
    logger.info("Updating existing Life-USTC/static checkout...");
    run(
      "git remote set-url origin https://github.com/Life-USTC/static.git",
      repoDir,
    );
    run("git fetch --depth 1 origin gh-pages", repoDir);
    run("git checkout -B gh-pages", repoDir);
    run("git reset --hard origin/gh-pages", repoDir);
  } else {
    logger.info("Cloning Life-USTC/static (sparse)...");
    fs.mkdirSync(repoDir, { recursive: true });
    run(
      "git clone --no-checkout --depth 1 --branch gh-pages https://github.com/Life-USTC/static.git .",
      repoDir,
    );
  }

  run("git sparse-checkout init --cone", repoDir);
  run("git sparse-checkout set cache static", repoDir);
  run("git checkout", repoDir);

  return repoDir;
}

// ---------------------------------------------------------------------------
// Course / Exam data (from cache/)
// ---------------------------------------------------------------------------

async function loadCourseData(repoDir: string, minSemesterJwId: number) {
  const cacheRoot = path.join(repoDir, "cache");

  if (!fs.existsSync(cacheRoot)) {
    logger.warning(
      "cache/ directory not found in static repo, skipping course data",
    );
    return;
  }

  logger.info("Loading semesters...");
  const semesterFile = path.join(
    cacheRoot,
    "catalog",
    "api",
    "teach",
    "semester",
    "list.json",
  );

  if (!fs.existsSync(semesterFile)) {
    logger.warning(
      `Semester list not found at ${semesterFile}, skipping course data`,
    );
    return;
  }

  const semesterData = JSON.parse(fs.readFileSync(semesterFile, "utf-8"));
  const semesters = await loadSemesters(semesterData, prisma)
    .then((semesters) => semesters.sort((a, b) => b.jwId - a.jwId))
    .then((semesters) => semesters.filter((s) => s.jwId >= minSemesterJwId));

  logger.info(
    `Filtered to ${semesters.length} semesters (code >= ${minSemesterJwId})`,
  );

  if (semesters.length === 0) {
    logger.warning("No semesters loaded. Skipping course data.");
    return;
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

  logger.info("Course data load complete!");
}

// ---------------------------------------------------------------------------
// Bus data (from static/)
// ---------------------------------------------------------------------------

async function loadBusData(repoDir: string) {
  const busFile = path.join(repoDir, "bus_data_v3.json");

  if (!fs.existsSync(busFile)) {
    logger.warning(`Bus data file not found at ${busFile}, skipping bus data`);
    return;
  }

  logger.info("Loading bus data...");
  const payload = JSON.parse(
    fs.readFileSync(busFile, "utf-8"),
  ) as BusStaticPayload;

  const result = await importBusStaticPayload(prisma, payload, {
    versionKey: "static-bus_data_v3",
    versionTitle: "Static Bus Timetable",
    effectiveFrom: null,
    effectiveUntil: null,
  });

  logger.info(
    `Imported bus data: version=${result.versionKey}, campuses=${result.campuses}, routes=${result.routes}, trips=${result.trips}`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cacheDir = process.argv[2] || "./.cache/life-ustc/static";
  const minSemesterJwId = Number.parseInt(process.argv[3] || "401", 10);

  try {
    logger.info(`Starting data load (min semester code: ${minSemesterJwId})`);
    logger.info("Downloading static repo...");
    const repoDir = downloadStaticRepo(cacheDir);
    logger.info(`Static repo at: ${repoDir}`);

    await loadCourseData(repoDir, minSemesterJwId);
    await loadBusData(repoDir);

    logger.info("All data load complete!");
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
