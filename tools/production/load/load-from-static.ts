import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { importBusStaticPayload } from "../../../src/features/bus/lib/bus-import";
import type {
  BusStaticCampus,
  BusStaticPayload,
  BusStaticRoute,
  BusStaticRouteSchedule,
} from "../../../src/features/bus/lib/bus-types";
import { createToolPrisma } from "../../shared/tool-prisma";

const { values: args } = parseArgs({
  options: {
    "cache-dir": { type: "string", default: "./.cache/life-ustc/static" },
    "snapshot-url": { type: "string" },
    "min-semester": { type: "string", default: "401" },
    "skip-courses": { type: "boolean", default: false },
    "skip-bus": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`Usage: bun run production:load:static -- [options]

Options:
  --cache-dir <path>      Snapshot download cache directory (default: .cache/life-ustc/static)
  --snapshot-url <url>    Override the published SQLite snapshot URL
  --min-semester <id>     Minimum semester jwId to import (default: 401)
  --skip-courses          Skip course/exam/schedule import
  --skip-bus              Skip bus data import
  -h, --help              Show this help message`);
  process.exit(0);
}

const cacheDir = args["cache-dir"] ?? "./.cache/life-ustc/static";
const minSemesterJwId = Number.parseInt(args["min-semester"] ?? "401", 10);
const snapshotUrl = args["snapshot-url"]?.trim();

const prisma = createToolPrisma();

type SqliteStatement = {
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};

type SqliteDatabase = {
  query: (sql: string) => SqliteStatement;
  close: () => void;
};

const { Database } = require("bun:sqlite") as {
  Database: new (
    filename: string,
    options?: { readonly?: boolean },
  ) => SqliteDatabase;
};

type SnapshotSemester = {
  id: string;
  name: string;
  start_date: number;
  end_date: number;
};

type SnapshotCourse = {
  id: number;
  semester_id: string;
  name: string;
  course_code: string;
  lesson_code: string;
  teacher_name: string;
  date_time_place_person_text: string | null;
  course_type: string | null;
  course_gradation: string;
  course_category: string;
  education_type: string;
  class_type: string;
  open_department: string;
  description: string;
  credit: number;
};

type SnapshotLecture = {
  course_id: number;
  position: number;
  start_date: number;
  end_date: number;
  name: string;
  location: string;
  teacher_name: string;
  periods: number;
  start_index: number;
  end_index: number;
  start_hhmm: number;
  end_hhmm: number;
};

type SnapshotExam = {
  course_id: number;
  position: number;
  start_date: number;
  end_date: number;
  name: string;
  location: string;
  exam_type: string;
  start_hhmm: number;
  end_hhmm: number;
  exam_mode: string | null;
};

type SnapshotBusNotice = {
  message: string | null;
  url: string | null;
};

type SnapshotBusCampus = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

type SnapshotBusRoute = {
  id: number;
};

type SnapshotBusRouteStop = {
  route_id: number;
  stop_order: number;
  campus_id: number;
};

type SnapshotBusTrip = {
  day_type: "weekday" | "weekend";
  schedule_id: number;
  route_id: number;
  position: number;
};

type SnapshotBusTripStopTime = {
  day_type: "weekday" | "weekend";
  schedule_id: number;
  position: number;
  stop_order: number;
  campus_id: number;
  departure_time: string | null;
};

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warning: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

const DEFAULT_SNAPSHOT_URLS = [
  "https://static.life-ustc.tiankaima.dev/life-ustc-static.sqlite",
];

const STATIC_SCHEMA_VERSION = 2;
const CHINA_OFFSET_SECONDS = 8 * 60 * 60;
const SYNTHETIC_JWID_BASE = 1_500_000_000;
const SYNTHETIC_JWID_SPAN = 400_000_000;

function uniqueSnapshotUrls(override?: string) {
  const urls = [override, process.env.LIFE_USTC_STATIC_SNAPSHOT_URL].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  urls.push(...DEFAULT_SNAPSHOT_URLS);
  return [...new Set(urls.map((url) => url.trim()))];
}

function stableNumericId(namespace: string, value: string) {
  const digest = createHash("sha256")
    .update(`${namespace}:${value}`)
    .digest("hex");
  return (
    SYNTHETIC_JWID_BASE +
    (Number.parseInt(digest.slice(0, 8), 16) % SYNTHETIC_JWID_SPAN)
  );
}

function stableDepartmentCode(name: string) {
  return `static-${createHash("sha256").update(name).digest("hex").slice(0, 12)}`;
}

function splitNames(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function toChinaLocalDate(unixSeconds: number) {
  const shifted = new Date((unixSeconds + CHINA_OFFSET_SECONDS) * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

function toChinaWeekday(unixSeconds: number) {
  const shifted = new Date((unixSeconds + CHINA_OFFSET_SECONDS) * 1000);
  const weekday = shifted.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function toWeekIndex(unixSeconds: number, semesterStartSeconds: number) {
  const deltaDays =
    (toChinaLocalDate(unixSeconds).getTime() -
      toChinaLocalDate(semesterStartSeconds).getTime()) /
    86_400_000;
  return Math.floor(deltaDays / 7) + 1;
}

function examTypeToCode(value: string) {
  if (value.includes("期中")) return 1;
  if (value.includes("期末")) return 2;
  return null;
}

class StaticSnapshot {
  private db: SqliteDatabase;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  close() {
    this.db.close();
  }

  private getOne<T>(sql: string, ...params: unknown[]) {
    return this.db.query(sql).get(...params) as T | null;
  }

  private getAll<T>(sql: string, ...params: unknown[]) {
    return this.db.query(sql).all(...params) as T[];
  }

  getMetadata(key: string) {
    const row = this.getOne<{ value: string }>(
      "SELECT value FROM metadata WHERE key = ?",
      key,
    );
    return row?.value ?? null;
  }

  assertSupportedSchema() {
    const schemaVersion = Number.parseInt(
      this.getMetadata("schema_version") ?? "",
      10,
    );
    if (schemaVersion !== STATIC_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported static snapshot schema version: ${schemaVersion || "unknown"}`,
      );
    }
  }

  listSemesters() {
    return this.getAll<SnapshotSemester>(
      "SELECT id, name, start_date, end_date FROM semesters ORDER BY CAST(id AS INTEGER) DESC",
    );
  }

  listCoursesForSemester(semesterId: string) {
    return this.getAll<SnapshotCourse>(
      `
      SELECT
        id,
        semester_id,
        name,
        course_code,
        lesson_code,
        teacher_name,
        date_time_place_person_text,
        course_type,
        course_gradation,
        course_category,
        education_type,
        class_type,
        open_department,
        description,
        credit
      FROM courses
      WHERE semester_id = ?
      ORDER BY lesson_code ASC, id ASC
      `,
      semesterId,
    );
  }

  listLecturesForCourse(courseId: number) {
    return this.getAll<SnapshotLecture>(
      `
      SELECT
        course_id,
        position,
        start_date,
        end_date,
        name,
        location,
        teacher_name,
        periods,
        start_index,
        end_index,
        start_hhmm,
        end_hhmm
      FROM course_lectures
      WHERE course_id = ?
      ORDER BY position ASC
      `,
      courseId,
    );
  }

  listExamsForCourse(courseId: number) {
    return this.getAll<SnapshotExam>(
      `
      SELECT
        course_id,
        position,
        start_date,
        end_date,
        name,
        location,
        exam_type,
        start_hhmm,
        end_hhmm,
        exam_mode
      FROM course_exams
      WHERE course_id = ?
      ORDER BY position ASC
      `,
      courseId,
    );
  }

  getBusNotice() {
    return this.getOne<SnapshotBusNotice>(
      "SELECT message, url FROM bus_notice WHERE id = 1",
    );
  }

  listBusCampuses() {
    return this.getAll<SnapshotBusCampus>(
      "SELECT id, name, latitude, longitude FROM bus_campuses ORDER BY id ASC",
    );
  }

  listBusRoutes() {
    return this.getAll<SnapshotBusRoute>(
      "SELECT id FROM bus_routes ORDER BY id ASC",
    );
  }

  listBusRouteStops() {
    return this.getAll<SnapshotBusRouteStop>(
      "SELECT route_id, stop_order, campus_id FROM bus_route_stops ORDER BY route_id ASC, stop_order ASC",
    );
  }

  listBusTrips(dayType: "weekday" | "weekend") {
    return this.getAll<SnapshotBusTrip>(
      `
      SELECT day_type, schedule_id, route_id, position
      FROM bus_trips
      WHERE day_type = ?
      ORDER BY schedule_id ASC, position ASC
      `,
      dayType,
    );
  }

  listBusTripStopTimes(dayType: "weekday" | "weekend") {
    return this.getAll<SnapshotBusTripStopTime>(
      `
      SELECT day_type, schedule_id, position, stop_order, campus_id, departure_time
      FROM bus_trip_stop_times
      WHERE day_type = ?
      ORDER BY schedule_id ASC, position ASC, stop_order ASC
      `,
      dayType,
    );
  }
}

async function downloadStaticSnapshot(
  targetDir: string,
  overrideUrl?: string,
): Promise<string> {
  const snapshotPath = path.join(targetDir, "life-ustc-static.sqlite");
  fs.mkdirSync(targetDir, { recursive: true });

  let lastError: Error | null = null;
  for (const url of uniqueSnapshotUrls(overrideUrl)) {
    try {
      logger.info(`Downloading static snapshot from ${url}`);
      const response = await fetch(url, {
        headers: { "user-agent": "life-ustc-static-import/1.0" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(snapshotPath, bytes);
      return snapshotPath;
    } catch (error: unknown) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Unknown error: ${String(error)}`);
      logger.warning(
        `Failed to download snapshot from ${url}: ${lastError.message}`,
      );
    }
  }

  if (fs.existsSync(snapshotPath)) {
    logger.warning(`Falling back to cached snapshot at ${snapshotPath}`);
    return snapshotPath;
  }

  throw new Error(
    `Unable to download static snapshot${
      lastError ? `: ${lastError.message}` : ""
    }`,
  );
}

async function upsertCourseType(nameCn: string | null) {
  if (!nameCn) return null;
  return prisma.courseType.upsert({
    where: { nameCn },
    update: { nameCn },
    create: { nameCn },
  });
}

async function upsertCourseGradation(nameCn: string | null) {
  if (!nameCn) return null;
  return prisma.courseGradation.upsert({
    where: { nameCn },
    update: { nameCn },
    create: { nameCn },
  });
}

async function upsertCourseCategory(nameCn: string | null) {
  if (!nameCn) return null;
  return prisma.courseCategory.upsert({
    where: { nameCn },
    update: { nameCn },
    create: { nameCn },
  });
}

async function upsertEducationLevel(nameCn: string | null) {
  if (!nameCn) return null;
  return prisma.educationLevel.upsert({
    where: { nameCn },
    update: { nameCn },
    create: { nameCn },
  });
}

async function upsertClassType(nameCn: string | null) {
  if (!nameCn) return null;
  return prisma.classType.upsert({
    where: { nameCn },
    update: { nameCn },
    create: { nameCn },
  });
}

async function findOrCreateDepartment(nameCn: string | null) {
  if (!nameCn) return null;

  const existing = await prisma.department.findFirst({
    where: { nameCn },
  });
  if (existing) {
    return existing;
  }

  const code = stableDepartmentCode(nameCn);
  return prisma.department.upsert({
    where: { code },
    update: { nameCn },
    create: {
      code,
      nameCn,
      isCollege: false,
    },
  });
}

async function findOrCreateTeacher(
  nameCn: string,
  departmentId?: number | null,
) {
  const exact = await prisma.teacher.findFirst({
    where: {
      nameCn,
      departmentId: departmentId ?? null,
    },
  });
  if (exact) {
    return exact;
  }

  if (departmentId == null) {
    const existing = await prisma.teacher.findFirst({
      where: { nameCn },
    });
    if (existing) {
      return existing;
    }
  }

  return prisma.teacher.create({
    data: {
      nameCn,
      departmentId: departmentId ?? null,
    },
  });
}

async function findOrCreateCourse(course: SnapshotCourse) {
  const [type, gradation, category, educationLevel, classType] =
    await Promise.all([
      upsertCourseType(course.course_type),
      upsertCourseGradation(course.course_gradation),
      upsertCourseCategory(course.course_category),
      upsertEducationLevel(course.education_type),
      upsertClassType(course.class_type),
    ]);

  const data = {
    code: course.course_code,
    nameCn: course.name,
    nameEn: null,
    typeId: type?.id,
    gradationId: gradation?.id,
    categoryId: category?.id,
    educationLevelId: educationLevel?.id,
    classTypeId: classType?.id,
  };

  const existing = await prisma.course.findFirst({
    where: {
      code: course.course_code,
      nameCn: course.name,
    },
  });

  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data,
    });
  }

  const syntheticJwId = stableNumericId("course", course.course_code);
  return prisma.course.upsert({
    where: { jwId: syntheticJwId },
    update: data,
    create: {
      jwId: syntheticJwId,
      ...data,
    },
  });
}

async function importCourses(
  snapshot: StaticSnapshot,
  minSemesterCode: number,
) {
  const semesters = snapshot
    .listSemesters()
    .filter((semester) => Number.parseInt(semester.id, 10) >= minSemesterCode);

  logger.info(
    `Filtered to ${semesters.length} semesters (code >= ${minSemesterCode})`,
  );

  for (const semester of semesters) {
    const semesterRecord = await prisma.semester.upsert({
      where: { jwId: Number.parseInt(semester.id, 10) },
      update: {
        nameCn: semester.name,
        code: semester.id,
        startDate: toChinaLocalDate(semester.start_date),
        endDate: toChinaLocalDate(semester.end_date),
      },
      create: {
        jwId: Number.parseInt(semester.id, 10),
        nameCn: semester.name,
        code: semester.id,
        startDate: toChinaLocalDate(semester.start_date),
        endDate: toChinaLocalDate(semester.end_date),
      },
    });

    const courses = snapshot.listCoursesForSemester(semester.id);
    logger.info(`Processing semester: ${semester.name} (${semester.id})`);

    for (const course of courses) {
      const [courseRecord, department, lectures, exams] = await Promise.all([
        findOrCreateCourse(course),
        findOrCreateDepartment(course.open_department),
        Promise.resolve(snapshot.listLecturesForCourse(course.id)),
        Promise.resolve(snapshot.listExamsForCourse(course.id)),
      ]);

      const teacherRecords = await Promise.all(
        splitNames(course.teacher_name).map((name) =>
          findOrCreateTeacher(name, null),
        ),
      );

      const totalPeriods = Math.round(
        lectures.reduce((sum, lecture) => sum + lecture.periods, 0),
      );

      const section = await prisma.section.upsert({
        where: { jwId: course.id },
        update: {
          code: course.lesson_code,
          credits: course.credit,
          period: totalPeriods || null,
          periodsPerWeek: null,
          timesPerWeek: null,
          stdCount: null,
          limitCount: null,
          graduateAndPostgraduate: null,
          dateTimePlaceText: course.date_time_place_person_text,
          dateTimePlacePersonText:
            course.date_time_place_person_text ?? undefined,
          actualPeriods: totalPeriods || null,
          scheduleState: lectures.length > 0 ? "STATIC_IMPORTED" : null,
          remark: course.description || null,
          courseId: courseRecord.id,
          semesterId: semesterRecord.id,
          openDepartmentId: department?.id,
          teachers: {
            set: teacherRecords.map((teacher) => ({ id: teacher.id })),
          },
        },
        create: {
          jwId: course.id,
          code: course.lesson_code,
          credits: course.credit,
          period: totalPeriods || null,
          periodsPerWeek: null,
          timesPerWeek: null,
          stdCount: null,
          limitCount: null,
          graduateAndPostgraduate: null,
          dateTimePlaceText: course.date_time_place_person_text,
          dateTimePlacePersonText:
            course.date_time_place_person_text ?? undefined,
          actualPeriods: totalPeriods || null,
          scheduleState: lectures.length > 0 ? "STATIC_IMPORTED" : null,
          remark: course.description || null,
          courseId: courseRecord.id,
          semesterId: semesterRecord.id,
          openDepartmentId: department?.id,
          teachers: {
            connect: teacherRecords.map((teacher) => ({ id: teacher.id })),
          },
        },
      });

      await prisma.schedule.deleteMany({ where: { sectionId: section.id } });
      await prisma.scheduleGroup.deleteMany({
        where: { sectionId: section.id },
      });

      if (lectures.length > 0) {
        const scheduleGroup = await prisma.scheduleGroup.create({
          data: {
            jwId: stableNumericId("schedule-group", String(course.id)),
            sectionId: section.id,
            no: 0,
            limitCount: 0,
            stdCount: 0,
            actualPeriods: totalPeriods || 0,
            isDefault: true,
          },
        });

        for (const lecture of lectures) {
          const scheduleTeachers = await Promise.all(
            splitNames(lecture.teacher_name).map((name) =>
              findOrCreateTeacher(name, null),
            ),
          );

          await prisma.schedule.create({
            data: {
              sectionId: section.id,
              scheduleGroupId: scheduleGroup.id,
              periods: Math.round(lecture.periods) || 0,
              date: toChinaLocalDate(lecture.start_date),
              weekday: toChinaWeekday(lecture.start_date),
              startTime: lecture.start_hhmm,
              endTime: lecture.end_hhmm,
              customPlace: lecture.location || null,
              weekIndex: toWeekIndex(lecture.start_date, semester.start_date),
              exerciseClass: false,
              startUnit: lecture.start_index,
              endUnit: lecture.end_index,
              teachers:
                scheduleTeachers.length > 0
                  ? {
                      connect: scheduleTeachers.map((teacher) => ({
                        id: teacher.id,
                      })),
                    }
                  : undefined,
            },
          });
        }
      }

      await prisma.exam.deleteMany({ where: { sectionId: section.id } });

      for (const [position, exam] of exams.entries()) {
        const examRecord = await prisma.exam.create({
          data: {
            jwId: stableNumericId("exam", `${course.id}:${position}`),
            examType: examTypeToCode(exam.exam_type),
            startTime: exam.start_hhmm,
            endTime: exam.end_hhmm,
            examDate: toChinaLocalDate(exam.start_date),
            examTakeCount: null,
            examMode: exam.exam_mode,
            sectionId: section.id,
          },
        });

        const rooms = exam.location
          .split(/[,，]/)
          .map((room) => room.trim())
          .filter(Boolean);

        if (rooms.length > 0) {
          await prisma.examRoom.createMany({
            data: rooms.map((room) => ({
              examId: examRecord.id,
              room,
              count: 1,
            })),
          });
        }
      }
    }
  }
}

function buildBusPayload(snapshot: StaticSnapshot): BusStaticPayload {
  const campuses = snapshot.listBusCampuses();
  const campusMap = new Map<number, BusStaticCampus>(
    campuses.map((campus) => [
      campus.id,
      {
        id: campus.id,
        name: campus.name,
        latitude: campus.latitude,
        longitude: campus.longitude,
      },
    ]),
  );

  const routeStops = snapshot.listBusRouteStops();
  const routeMap = new Map<number, BusStaticRoute>();

  for (const route of snapshot.listBusRoutes()) {
    routeMap.set(route.id, {
      id: route.id,
      campuses: routeStops
        .filter((stop) => stop.route_id === route.id)
        .sort((left, right) => left.stop_order - right.stop_order)
        .map((stop) => {
          const campus = campusMap.get(stop.campus_id);
          if (!campus) {
            throw new Error(`Unknown bus campus id ${stop.campus_id}`);
          }
          return campus;
        }),
    });
  }

  const buildSchedules = (dayType: "weekday" | "weekend") => {
    const stopTimes = snapshot.listBusTripStopTimes(dayType);
    const groupedTrips = new Map<string, BusStaticRouteSchedule>();

    for (const trip of snapshot.listBusTrips(dayType)) {
      const route = routeMap.get(trip.route_id);
      if (!route) {
        throw new Error(`Unknown bus route id ${trip.route_id}`);
      }

      const key = `${trip.schedule_id}`;
      let schedule = groupedTrips.get(key);
      if (!schedule) {
        schedule = {
          id: trip.schedule_id,
          route,
          time: [],
        };
        groupedTrips.set(key, schedule);
      }

      schedule.time[trip.position] = stopTimes
        .filter(
          (stopTime) =>
            stopTime.schedule_id === trip.schedule_id &&
            stopTime.position === trip.position,
        )
        .sort((left, right) => left.stop_order - right.stop_order)
        .map((stopTime) => stopTime.departure_time);
    }

    return [...groupedTrips.values()].sort((left, right) => left.id - right.id);
  };

  const notice = snapshot.getBusNotice();

  return {
    campuses: [...campusMap.values()].sort((left, right) => left.id - right.id),
    routes: [...routeMap.values()].sort((left, right) => left.id - right.id),
    weekday_routes: buildSchedules("weekday"),
    weekend_routes: buildSchedules("weekend"),
    message: {
      message: notice?.message ?? "",
      url: notice?.url ?? "",
    },
  };
}

async function loadBusData(snapshot: StaticSnapshot) {
  logger.info("Loading bus data...");
  const payload = buildBusPayload(snapshot);

  const result = await importBusStaticPayload(prisma, payload, {
    versionKey: "static-bus-structured",
    versionTitle: "Static Structured Bus Timetable",
    effectiveFrom: null,
    effectiveUntil: null,
  });

  logger.info(
    `Imported bus data: version=${result.versionKey}, campuses=${result.campuses}, routes=${result.routes}, trips=${result.trips}`,
  );
}

async function main() {
  try {
    logger.info(`Starting data load (min semester code: ${minSemesterJwId})`);
    logger.info("Downloading static snapshot...");
    const snapshotPath = await downloadStaticSnapshot(cacheDir, snapshotUrl);
    const snapshot = new StaticSnapshot(snapshotPath);
    logger.info(`Static snapshot at: ${snapshotPath}`);

    try {
      snapshot.assertSupportedSchema();
      const generatedAt = snapshot.getMetadata("generated_at");
      if (generatedAt) {
        logger.info(`Snapshot generated at: ${generatedAt}`);
      }

      if (!args["skip-courses"]) {
        await importCourses(snapshot, minSemesterJwId);
      } else {
        logger.info("Skipping course data (--skip-courses)");
      }

      if (!args["skip-bus"]) {
        await loadBusData(snapshot);
      } else {
        logger.info("Skipping bus data (--skip-bus)");
      }
    } finally {
      snapshot.close();
    }

    logger.info("All data load complete!");
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Fatal error: ${err.message}`);
    if (err.stack) {
      logger.error(`Stack trace: ${err.stack}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
