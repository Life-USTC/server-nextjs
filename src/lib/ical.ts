import {
  ICalCalendar,
  ICalCategory,
  ICalEventBusyStatus,
} from "ical-generator";
import type { Prisma } from "@/generated/prisma/client";
import { getBuildingImagePath, getLocationGeo } from "@/lib/location-utils";
import { APP_TIME_ZONE } from "@/lib/time/parse-date-input";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";

function generateShanghaiVTimezone(timezone: string): string | null {
  if (timezone !== APP_TIME_ZONE) return null;

  return [
    "BEGIN:VTIMEZONE",
    `TZID:${APP_TIME_ZONE}`,
    `X-LIC-LOCATION:${APP_TIME_ZONE}`,
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:CST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ].join("\r\n");
}

type CalendarSection = Prisma.SectionGetPayload<{
  include: {
    course: true;
    schedules: {
      include: {
        room: {
          include: {
            building: {
              include: {
                campus: true;
              };
            };
          };
        };
        teachers: true;
      };
    };
    exams: {
      include: {
        examRooms: true;
      };
    };
  };
}>;

type CalendarHomework = Prisma.HomeworkGetPayload<{
  include: {
    description: {
      select: {
        content: true;
      };
    };
    section: {
      include: {
        course: true;
      };
    };
  };
}>;

type CalendarTodo = {
  id: string;
  title: string;
  content: string | null;
  dueAt: Date;
  priority: "low" | "medium" | "high";
};

function createBaseCalendar(
  config: ConstructorParameters<typeof ICalCalendar>[0],
): ICalCalendar {
  return new ICalCalendar(config);
}

async function appendSectionEvents(
  calendar: ICalCalendar,
  sections: CalendarSection[],
): Promise<void> {
  for (const section of sections) {
    for (const schedule of section.schedules) {
      await createScheduleEvent(schedule, section, calendar);
    }

    for (const exam of section.exams) {
      await createExamEvent(exam, section, calendar);
    }
  }
}

/**
 * Creates an iCal calendar for a specific section
 */
export async function createSectionCalendar(
  section: CalendarSection,
): Promise<ICalCalendar> {
  const calendar = createBaseCalendar({
    name: `${section.course.nameCn} (${section.code})`,
    description: `Calendar for ${section.course.nameCn} (${section.code}), brought to you by Life@USTC`,
    timezone: {
      name: APP_TIME_ZONE,
      generator: generateShanghaiVTimezone,
    },
    url: `https://life-ustc.tiankaima.dev/sections/${section.jwId}`,
    scale: "GREGORIAN",
  });

  await appendSectionEvents(calendar, [section]);

  return calendar;
}

/**
 * Creates an iCal calendar for multiple sections
 */
export async function createMultiSectionCalendar(
  sections: CalendarSection[],
): Promise<ICalCalendar> {
  const calendar = createBaseCalendar({
    name: "Life @ USTC",
    description:
      "Calendar for subscribed courses, brought to you by Life@USTC <https://life-ustc.tiankaima.dev/>",
    timezone: {
      name: APP_TIME_ZONE,
      generator: generateShanghaiVTimezone,
    },
    url: "https://life-ustc.tiankaima.dev",
    scale: "GREGORIAN",
  });

  await appendSectionEvents(calendar, sections);

  return calendar;
}

export async function createUserCalendar({
  sections,
  homeworks,
  todos,
}: {
  sections: CalendarSection[];
  homeworks: CalendarHomework[];
  todos: CalendarTodo[];
}): Promise<ICalCalendar> {
  const calendar = createBaseCalendar({
    name: "Life @ USTC",
    description:
      "Calendar for the current user, including subscribed courses and personal deadlines, brought to you by Life@USTC <https://life-ustc.tiankaima.dev/>",
    timezone: {
      name: APP_TIME_ZONE,
      generator: generateShanghaiVTimezone,
    },
    url: "https://life-ustc.tiankaima.dev",
    scale: "GREGORIAN",
  });

  await appendSectionEvents(calendar, sections);

  for (const homework of homeworks) {
    await createHomeworkEvent(homework, calendar);
  }

  for (const todo of todos) {
    createTodoEvent(todo, calendar);
  }

  return calendar;
}

/**
 * Creates an iCal event from a schedule
 */
async function createScheduleEvent(
  schedule: Prisma.ScheduleGetPayload<{
    include: {
      room: {
        include: {
          building: {
            include: {
              campus: true;
            };
          };
        };
      };
      teachers: true;
    };
  }>,
  section: Prisma.SectionGetPayload<{
    include: {
      course: true;
    };
  }>,
  calendar: ICalCalendar,
): Promise<void> {
  if (!schedule.date) return;

  const startDate = shanghaiDayjs(schedule.date)
    .hour(Math.floor(schedule.startTime / 100))
    .minute(schedule.startTime % 100)
    .second(0);

  const endDate = shanghaiDayjs(schedule.date)
    .hour(Math.floor(schedule.endTime / 100))
    .minute(schedule.endTime % 100)
    .second(0);

  const location = schedule.room?.building?.campus
    ? `${schedule.room.nameCn} (${schedule.room.building.campus.nameCn}-${schedule.room.building.nameCn})`
    : schedule.customPlace || "Location TBD";

  const teacherNames =
    schedule.teachers && schedule.teachers.length > 0
      ? schedule.teachers
          .map((t) => [t.nameCn, t.nameEn].filter(Boolean).join(" / "))
          .join(", ")
      : "";

  const summary = `${section.course.nameCn}`;
  const description = [
    section.course.nameCn,
    teacherNames && `教师：${teacherNames}`,
    schedule.experiment && `实验：${schedule.experiment}`,
  ]
    .filter(Boolean)
    .join("\n");

  const categories = [
    "课程",
    section.course.nameCn,
    section.code,
    section.course.code,
  ]
    .filter((category) => category && category.trim() !== "")
    .map((category) => new ICalCategory({ name: category }));

  // Get geo coordinates if available
  const geoData = await getLocationGeo(location);

  // Get building image if room code is available
  const buildingImageUrl = schedule.room?.code
    ? await getBuildingImagePath(schedule.room.code)
    : null;

  const eventData: Parameters<typeof calendar.createEvent>[0] = {
    start: startDate,
    end: endDate,
    timezone: APP_TIME_ZONE,
    summary,
    description,
    location: {
      title: location,
      address: "",
      radius: 10,
      geo: geoData
        ? {
            lat: geoData.latitude,
            lon: geoData.longitude,
          }
        : undefined,
    },
    id: `life-ustc.tiankaima.dev/schedule/${schedule.id}`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.BUSY,
    categories,
    attachments: buildingImageUrl ? [buildingImageUrl] : undefined,
  };

  calendar.createEvent(eventData);
}

/**
 * Creates an iCal event from an exam
 */
async function createExamEvent(
  exam: Prisma.ExamGetPayload<{
    include: {
      examRooms: true;
    };
  }>,
  section: Prisma.SectionGetPayload<{
    include: {
      course: true;
    };
  }>,
  calendar: ICalCalendar,
): Promise<void> {
  if (!exam.examDate) return;

  const startDate = shanghaiDayjs(exam.examDate)
    .hour(Math.floor((exam.startTime || 0) / 100))
    .minute((exam.startTime || 0) % 100)
    .second(0);

  const endDate = shanghaiDayjs(exam.examDate)
    .hour(Math.floor((exam.endTime || 0) / 100))
    .minute((exam.endTime || 0) % 100)
    .second(0);

  const rooms = exam.examRooms
    .map((examRoom) => examRoom.room)
    .filter(Boolean)
    .join(", ");

  const location = rooms || "Exam Location TBD";

  const examTypeLabel =
    exam.examType === 1
      ? "期中考试"
      : exam.examType === 2
        ? "期末考试"
        : "考试";

  const summary = `${section.course.nameCn} - ${examTypeLabel}`;
  const description = [
    `${section.course.nameCn} (${section.code})`,
    `类型：${examTypeLabel}`,
    exam.examMode && `考试方式：${exam.examMode}`,
    exam.examTakeCount && `考试人数：${exam.examTakeCount}`,
    rooms && `考场：${rooms}`,
  ]
    .filter(Boolean)
    .join("\n");

  const categories = [
    "考试",
    examTypeLabel,
    section.course.nameCn,
    section.code,
    section.course.code,
  ]
    .filter((category) => category && category.trim() !== "")
    .map((category) => new ICalCategory({ name: category }));

  const geoData = await getLocationGeo(location);

  // Get building image if room code is available
  const buildingImageUrl =
    exam.examRooms.length > 0
      ? await getBuildingImagePath(exam.examRooms[0].room)
      : null;

  const eventData: Parameters<typeof calendar.createEvent>[0] = {
    start: startDate,
    end: endDate,
    timezone: APP_TIME_ZONE,
    summary,
    description,
    location: {
      title: location,
      address: "",
      radius: 10,
      geo: geoData
        ? {
            lat: geoData.latitude,
            lon: geoData.longitude,
          }
        : undefined,
    },
    id: `life-ustc.tiankaima.dev/exam/${exam.id}`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.BUSY,
    categories,
    attachments: buildingImageUrl ? [buildingImageUrl] : undefined,
  };

  calendar.createEvent(eventData);
}

async function createHomeworkEvent(
  homework: CalendarHomework,
  calendar: ICalCalendar,
): Promise<void> {
  if (!homework.submissionDueAt) return;

  const dueDate = shanghaiDayjs(homework.submissionDueAt);
  const endDate = dueDate.add(30, "minute");
  const section = homework.section;
  const courseName = section.course.nameCn;
  const summary = `${courseName} - 作业截止: ${homework.title}`;
  const description = [
    `${courseName} (${section.code})`,
    homework.isMajor ? "重要作业" : null,
    homework.requiresTeam ? "需要组队" : null,
    homework.description?.content?.trim() || null,
  ]
    .filter(Boolean)
    .join("\n");

  const categories = [
    "作业",
    courseName,
    section.code,
    section.course.code,
    homework.isMajor ? "重要作业" : null,
  ]
    .filter((category): category is string => Boolean(category?.trim()))
    .map((category) => new ICalCategory({ name: category }));

  const eventData: Parameters<typeof calendar.createEvent>[0] = {
    start: dueDate,
    end: endDate,
    timezone: APP_TIME_ZONE,
    summary,
    description,
    id: `life-ustc.tiankaima.dev/homework/${homework.id}`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.FREE,
    categories,
  };

  calendar.createEvent(eventData);
}

function createTodoEvent(todo: CalendarTodo, calendar: ICalCalendar): void {
  const dueDate = shanghaiDayjs(todo.dueAt);
  const endDate = dueDate.add(30, "minute");
  const priorityLabel =
    todo.priority === "high"
      ? "高优先级"
      : todo.priority === "medium"
        ? "中优先级"
        : "低优先级";
  const description = [priorityLabel, todo.content?.trim() || null]
    .filter(Boolean)
    .join("\n");

  const categories = ["待办", priorityLabel]
    .filter((category): category is string => Boolean(category?.trim()))
    .map((category) => new ICalCategory({ name: category }));

  const eventData: Parameters<typeof calendar.createEvent>[0] = {
    start: dueDate,
    end: endDate,
    timezone: APP_TIME_ZONE,
    summary: `待办截止: ${todo.title}`,
    description,
    id: `life-ustc.tiankaima.dev/todo/${todo.id}`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.FREE,
    categories,
  };

  calendar.createEvent(eventData);
}
