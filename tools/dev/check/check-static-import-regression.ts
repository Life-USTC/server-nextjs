import "dotenv/config";

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { Client } from "pg";

type DatasetResult = {
  name: string;
  count: number;
  hash: string;
};

type BaselineSource = {
  description: string;
  materialize: () => Promise<void>;
};

const repoRoot = process.cwd();
const importerRepoPath = "tools/production/load/load-from-static.ts";
const currentImporterPath = path.join(repoRoot, importerRepoPath);
const baselineImporterPath = path.join(
  repoRoot,
  "tools/production/load/load-from-static.baseline.ts",
);

const { values: args } = parseArgs({
  options: {
    "baseline-importer": { type: "string" },
    "baseline-ref": { type: "string" },
    "min-semester": { type: "string", default: "401" },
    "cache-dir": { type: "string" },
    "skip-bus": { type: "boolean", default: false },
    "keep-databases": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`Usage: bun run check:static-import -- [options]

Options:
  --baseline-importer <path>
                           Importer file used as the baseline
  --baseline-ref <git-ref> Compare against ${importerRepoPath} from a Git ref
  --min-semester <id>      Minimum semester jwId to import (default: 401)
  --cache-dir <path>       Snapshot download cache directory
  --skip-bus               Skip bus import in both baseline and candidate runs
  --keep-databases         Keep temporary comparison databases for inspection
  -h, --help               Show this help message

Exactly one of --baseline-importer or --baseline-ref is required.`);
  process.exit(0);
}

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL is required");
  }
  return value;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildControlDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

async function runCommand(
  command: string,
  commandArgs: string[],
  env: NodeJS.ProcessEnv,
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${commandArgs.join(" ")} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function captureCommand(
  command: string,
  commandArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
) {
  return await new Promise<string>((resolve, reject) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString("utf8"));
        return;
      }

      const details = Buffer.concat(stderr).toString("utf8").trim();
      reject(
        new Error(
          details ||
            `${command} ${commandArgs.join(" ")} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function withAdminClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>,
) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function dropDatabase(client: Client, dbName: string) {
  await client.query(
    `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()
    `,
    [dbName],
  );
  await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(dbName)}`);
}

async function recreateDatabase(client: Client, dbName: string) {
  await dropDatabase(client, dbName);
  await client.query(`CREATE DATABASE ${quoteIdentifier(dbName)}`);
}

function withDatabaseName(databaseUrl: string, dbName: string) {
  const url = new URL(databaseUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

function buildImporterArgs() {
  const importerArgs = ["--min-semester", args["min-semester"] ?? "401"];
  if (args["cache-dir"]) {
    importerArgs.push("--cache-dir", args["cache-dir"]);
  }
  if (args["skip-bus"]) {
    importerArgs.push("--skip-bus");
  }
  return importerArgs;
}

async function fetchRows(connectionString: string, sql: string) {
  return await withAdminClient(connectionString, async (client) => {
    const result = await client.query<{ row: unknown }>(sql);
    return result.rows.map((row) => row.row);
  });
}

async function collectDataset(
  connectionString: string,
  name: string,
  sql: string,
) {
  const rows = await fetchRows(connectionString, sql);
  return {
    rows,
    result: {
      name,
      count: rows.length,
      hash: sha256(JSON.stringify(rows)),
    } satisfies DatasetResult,
  };
}

function firstDifference(left: unknown[], right: unknown[]) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
      return { index, leftValue, rightValue };
    }
  }
  return null;
}

function resolveImporterPath(importerPath: string) {
  return path.resolve(repoRoot, importerPath);
}

async function materializeBaselineImporter(importerPath: string) {
  await fs.copyFile(resolveImporterPath(importerPath), baselineImporterPath);
}

async function materializeBaselineImporterFromRef(ref: string) {
  const file = await captureCommand("git", [
    "--no-pager",
    "show",
    `${ref}:${importerRepoPath}`,
  ]);
  await fs.writeFile(baselineImporterPath, file);
}

function resolveBaselineSource(): BaselineSource {
  const baselineImporter = args["baseline-importer"]?.trim();
  const baselineRef = args["baseline-ref"]?.trim();

  if (baselineImporter && baselineRef) {
    throw new Error(
      "Pass exactly one of --baseline-importer or --baseline-ref, not both",
    );
  }

  if (baselineImporter) {
    return {
      description: resolveImporterPath(baselineImporter),
      materialize: () => materializeBaselineImporter(baselineImporter),
    };
  }

  if (baselineRef) {
    return {
      description: `${importerRepoPath} @ ${baselineRef}`,
      materialize: () => materializeBaselineImporterFromRef(baselineRef),
    };
  }

  throw new Error(
    "check:static-import requires a real baseline. Pass --baseline-ref <git-ref> or --baseline-importer <path>.",
  );
}

const DATASET_QUERIES = [
  {
    name: "courses",
    sql: `
      SELECT jsonb_build_object(
        'jwId', c."jwId",
        'code', c."code",
        'nameCn', c."nameCn",
        'typeName', ct."nameCn",
        'gradationName', cg."nameCn",
        'categoryName', cc."nameCn",
        'educationLevelName', el."nameCn",
        'classTypeName', clt."nameCn"
      ) AS row
      FROM "Course" c
      LEFT JOIN "CourseType" ct ON ct.id = c."typeId"
      LEFT JOIN "CourseGradation" cg ON cg.id = c."gradationId"
      LEFT JOIN "CourseCategory" cc ON cc.id = c."categoryId"
      LEFT JOIN "EducationLevel" el ON el.id = c."educationLevelId"
      LEFT JOIN "ClassType" clt ON clt.id = c."classTypeId"
      ORDER BY c."jwId"
    `,
  },
  {
    name: "sections",
    sql: `
      SELECT jsonb_build_object(
        'jwId', s."jwId",
        'code', s."code",
        'credits', s."credits",
        'period', s."period",
        'dateTimePlaceText', s."dateTimePlaceText",
        'dateTimePlacePersonText', s."dateTimePlacePersonText",
        'actualPeriods', s."actualPeriods",
        'scheduleState', s."scheduleState",
        'remark', s."remark",
        'courseJwId', c."jwId",
        'semesterJwId', sem."jwId",
        'openDepartmentName', d."nameCn"
      ) AS row
      FROM "Section" s
      INNER JOIN "Course" c ON c.id = s."courseId"
      LEFT JOIN "Semester" sem ON sem.id = s."semesterId"
      LEFT JOIN "Department" d ON d.id = s."openDepartmentId"
      ORDER BY s."jwId"
    `,
  },
  {
    name: "section_teacher_links",
    sql: `
      SELECT jsonb_build_object(
        'sectionJwId', s."jwId",
        'teacherName', t."nameCn",
        'teacherDepartmentName', d."nameCn"
      ) AS row
      FROM "_SectionTeachers" st
      INNER JOIN "Section" s ON s.id = st."A"
      INNER JOIN "Teacher" t ON t.id = st."B"
      LEFT JOIN "Department" d ON d.id = t."departmentId"
      ORDER BY s."jwId", t."nameCn", COALESCE(d."nameCn", '')
    `,
  },
  {
    name: "schedule_groups",
    sql: `
      SELECT jsonb_build_object(
        'jwId', sg."jwId",
        'sectionJwId', s."jwId",
        'no', sg."no",
        'limitCount', sg."limitCount",
        'stdCount', sg."stdCount",
        'actualPeriods', sg."actualPeriods",
        'isDefault', sg."isDefault"
      ) AS row
      FROM "ScheduleGroup" sg
      INNER JOIN "Section" s ON s.id = sg."sectionId"
      ORDER BY sg."jwId"
    `,
  },
  {
    name: "schedules",
    sql: `
      SELECT jsonb_build_object(
        'sectionJwId', s."jwId",
        'scheduleGroupJwId', sg."jwId",
        'periods', sc."periods",
        'date', TO_CHAR(sc."date", 'YYYY-MM-DD'),
        'weekday', sc."weekday",
        'startTime', sc."startTime",
        'endTime', sc."endTime",
        'customPlace', sc."customPlace",
        'weekIndex', sc."weekIndex",
        'exerciseClass', sc."exerciseClass",
        'startUnit', sc."startUnit",
        'endUnit', sc."endUnit",
        'teacherNames', COALESCE(
          ARRAY_AGG(t."nameCn" ORDER BY t."nameCn")
            FILTER (WHERE t.id IS NOT NULL),
          ARRAY[]::text[]
        )
      ) AS row
      FROM "Schedule" sc
      INNER JOIN "Section" s ON s.id = sc."sectionId"
      INNER JOIN "ScheduleGroup" sg ON sg.id = sc."scheduleGroupId"
      LEFT JOIN "_ScheduleTeachers" st ON st."A" = sc.id
      LEFT JOIN "Teacher" t ON t.id = st."B"
      GROUP BY
        sc.id,
        s."jwId",
        sg."jwId"
      ORDER BY
        s."jwId",
        sg."jwId",
        TO_CHAR(sc."date", 'YYYY-MM-DD'),
        sc."weekday",
        sc."startTime",
        sc."endTime",
        COALESCE(sc."customPlace", ''),
        sc."weekIndex",
        sc."startUnit",
        sc."endUnit"
    `,
  },
  {
    name: "exams",
    sql: `
      SELECT jsonb_build_object(
        'jwId', e."jwId",
        'sectionJwId', s."jwId",
        'examType', e."examType",
        'startTime', e."startTime",
        'endTime', e."endTime",
        'examDate', TO_CHAR(e."examDate", 'YYYY-MM-DD'),
        'examMode', e."examMode",
        'rooms', COALESCE(
          ARRAY_AGG(er."room" ORDER BY er."room")
            FILTER (WHERE er.id IS NOT NULL),
          ARRAY[]::text[]
        )
      ) AS row
      FROM "Exam" e
      INNER JOIN "Section" s ON s.id = e."sectionId"
      LEFT JOIN "ExamRoom" er ON er."examId" = e.id
      GROUP BY e.id, s."jwId"
      ORDER BY e."jwId"
    `,
  },
  {
    name: "bus_versions",
    sql: `
      SELECT jsonb_build_object(
        'key', bsv."key",
        'checksum', bsv."checksum",
        'sourceMessage', bsv."sourceMessage",
        'sourceUrl', bsv."sourceUrl",
        'rawJson', bsv."rawJson"
      ) AS row
      FROM "BusScheduleVersion" bsv
      ORDER BY bsv.id
    `,
  },
] as const;

async function prepareDatabase(databaseUrl: string) {
  await runCommand("bun", ["run", "prisma:deploy"], {
    ...process.env,
    DATABASE_URL: databaseUrl,
  });
}

async function runImporter(importerPath: string, databaseUrl: string) {
  await runCommand(
    "bun",
    [resolveImporterPath(importerPath), ...buildImporterArgs()],
    {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  );
}

async function compareDatasets(
  baselineDatabaseUrl: string,
  candidateDatabaseUrl: string,
) {
  const summaries: DatasetResult[] = [];

  for (const dataset of DATASET_QUERIES) {
    const baseline = await collectDataset(
      baselineDatabaseUrl,
      dataset.name,
      dataset.sql,
    );
    const candidate = await collectDataset(
      candidateDatabaseUrl,
      dataset.name,
      dataset.sql,
    );

    if (baseline.result.hash !== candidate.result.hash) {
      const diff = firstDifference(baseline.rows, candidate.rows);
      const mismatchSummary = [
        `Dataset mismatch: ${dataset.name}`,
        `baseline count=${baseline.result.count} hash=${baseline.result.hash}`,
        `candidate count=${candidate.result.count} hash=${candidate.result.hash}`,
      ];
      if (diff) {
        mismatchSummary.push(`first differing row index=${diff.index}`);
        mismatchSummary.push(`baseline row=${JSON.stringify(diff.leftValue)}`);
        mismatchSummary.push(
          `candidate row=${JSON.stringify(diff.rightValue)}`,
        );
      }
      throw new Error(mismatchSummary.join("\n"));
    }

    summaries.push(candidate.result);
  }

  return summaries;
}

async function main() {
  const baselineSource = resolveBaselineSource();
  const baseDatabaseUrl = requireDatabaseUrl();
  const controlDatabaseUrl = buildControlDatabaseUrl(baseDatabaseUrl);
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const baselineDbName = `static_import_reg_${runId}_base`;
  const candidateDbName = `static_import_reg_${runId}_cand`;
  const baselineDatabaseUrl = withDatabaseName(baseDatabaseUrl, baselineDbName);
  const candidateDatabaseUrl = withDatabaseName(
    baseDatabaseUrl,
    candidateDbName,
  );
  const importerArgs = buildImporterArgs();

  console.log(
    `[static-import] comparing ${baselineSource.description} against workspace with args: ${importerArgs.join(" ")}`,
  );

  await baselineSource.materialize();

  try {
    await withAdminClient(controlDatabaseUrl, async (client) => {
      await recreateDatabase(client, baselineDbName);
      await recreateDatabase(client, candidateDbName);
    });

    console.log(
      `[static-import] prepared databases: ${baselineDbName}, ${candidateDbName}`,
    );

    await prepareDatabase(baselineDatabaseUrl);
    await prepareDatabase(candidateDatabaseUrl);

    console.log("[static-import] running baseline importer");
    await runImporter(baselineImporterPath, baselineDatabaseUrl);

    console.log("[static-import] running candidate importer");
    await runImporter(currentImporterPath, candidateDatabaseUrl);

    console.log("[static-import] comparing canonical outputs");
    const summaries = await compareDatasets(
      baselineDatabaseUrl,
      candidateDatabaseUrl,
    );

    for (const summary of summaries) {
      console.log(
        `[static-import] matched ${summary.name}: count=${summary.count} hash=${summary.hash}`,
      );
    }
  } finally {
    await fs.rm(baselineImporterPath, { force: true });

    if (!args["keep-databases"]) {
      await withAdminClient(controlDatabaseUrl, async (client) => {
        await dropDatabase(client, baselineDbName);
        await dropDatabase(client, candidateDbName);
      });
    }
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`[static-import] ${message}`);
  process.exit(1);
});
