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
              roomType: true;
            };
          };
          teacher: {
            include: {
              department: true;
            };
          };
          scheduleGroup: true;
        };
        orderBy: [{ date: "asc" }, { startTime: "asc" }];
      };
    };
  }>,
  scheduleGroupId?: number,
): ICalCalendar {
  const calendar = new ICalCalendar({
    name: `${section.course.nameCn} - ${section.code}`,
    description: `Course calendar for ${section.course.nameCn} (${section.code})`,
    timezone: "Asia/Shanghai",
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://life.ustc.edu.cn"}/courses/${section.courseId}`,
    scale: "GREGORIAN",
  });

  // Filter schedules by schedule group if specified
  const schedules = scheduleGroupId
    ? section.schedules.filter((s) => s.scheduleGroupId === scheduleGroupId)
    : section.schedules;

  // Create events for each schedule
  for (const schedule of schedules) {
    createScheduleEvent(schedule, section, calendar);
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
          roomType: true;
        };
      };
      teacher: {
        include: {
          department: true;
        };
      };
      scheduleGroup: true;
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
    ? `${schedule.room.building.campus.nameCn} - ${schedule.room.building.nameCn} ${schedule.room.nameCn}`
    : schedule.customPlace || "Location TBD";

  const teacherNames = schedule.teacher
    ? [schedule.teacher.nameCn, schedule.teacher.nameEn]
        .filter(Boolean)
        .join(" / ")
    : "";

  // Build event summary
  const summaryParts = [section.course.code, schedule.lessonType || "课堂"];
  const summary = summaryParts.join(" ");

  // Build description
  const descriptionParts = [
    section.course.nameCn,
    teacherNames && `教师: ${teacherNames}`,
    schedule.experiment && `实验: ${schedule.experiment}`,
    schedule.scheduleGroup.isDefault === false &&
      `教学班: ${schedule.scheduleGroup.no}`,
  ].filter(Boolean);
  const description = descriptionParts.join("\\n");

  const categories = ["课程", section.course.nameCn]
    .filter((category) => category && category.trim() !== "")
    .map((category) => new ICalCategory({ name: category }));

  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary,
    description,
    location,
    id: `schedule-${schedule.id}@life-ustc`,
    sequence: 0,
    busystatus: ICalEventBusyStatus.BUSY,
    categories,
  });
}
