import type { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import {
  ICalCalendar,
  ICalCategory,
  ICalEventBusyStatus,
} from "ical-generator";

/**
 * Creates an iCal calendar for a specific section
 */
export function createSectionCalendar(
  section: Prisma.SectionGetPayload<{
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
          teacher: true;
        };
      };
      exams: {
        include: {
          examRooms: true;
        };
      };
    };
  }>,
): ICalCalendar {
  const calendar = new ICalCalendar({
    name: `${section.course.nameCn} (${section.code})`,
    description: `Calendar for ${section.course.nameCn} (${section.code}), brought to you by Life@USTC`,
    timezone: "Asia/Shanghai",
    url: `https://life-ustc.tiankaima.dev/sections/${section.jwId}`,
    scale: "GREGORIAN",
  });

  // Create events for each schedule
  for (const schedule of section.schedules) {
    createScheduleEvent(schedule, section, calendar);
  }

  // Create events for each exam
  for (const exam of section.exams) {
    createExamEvent(exam, section, calendar);
  }

  return calendar;
}

/**
 * Creates an iCal event from a schedule
 */
function createScheduleEvent(
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
      teacher: true;
    };
  }>,
  section: Prisma.SectionGetPayload<{
    include: {
      course: true;
    };
  }>,
  calendar: ICalCalendar,
) {
  if (!schedule.date) return null;

  const startDate = dayjs(schedule.date)
    .hour(Math.floor(schedule.startTime / 100))
    .minute(schedule.startTime % 100)
    .second(0)
    .toDate();

  const endDate = dayjs(schedule.date)
    .hour(Math.floor(schedule.endTime / 100))
    .minute(schedule.endTime % 100)
    .second(0)
    .toDate();

  const location = schedule.room?.building?.campus
    ? `${schedule.room.nameCn} (${schedule.room.building.campus.nameCn}-${schedule.room.building.nameCn})`
    : schedule.customPlace || "Location TBD";

  const teacherNames = schedule.teacher
    ? [schedule.teacher.nameCn, schedule.teacher.nameEn]
        .filter(Boolean)
        .join(" / ")
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

  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary,
    description,
    location,
    id: `life-ustc.tiankaima.dev/schedule/${schedule.id}`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.BUSY,
    categories,
  });
}

/**
 * Creates an iCal event from an exam
 */
function createExamEvent(
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
) {
  if (!exam.examDate) return null;

  const startDate = dayjs(exam.examDate)
    .hour(Math.floor((exam.startTime || 0) / 100))
    .minute((exam.startTime || 0) % 100)
    .second(0)
    .toDate();

  const endDate = dayjs(exam.examDate)
    .hour(Math.floor((exam.endTime || 0) / 100))
    .minute((exam.endTime || 0) % 100)
    .second(0)
    .toDate();

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

  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary,
    description,
    location,
    id: `life-ustc.tiankaima.dev/exam/${exam.id}`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.BUSY,
    categories,
  });
}
