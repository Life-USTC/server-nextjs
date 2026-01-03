import type { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import {
  ICalCalendar,
  ICalCategory,
  ICalEventBusyStatus,
} from "ical-generator";
import { getBuildingImagePath, getLocationGeo } from "@/lib/location-utils";

/**
 * Creates an iCal calendar for a specific section
 */
export async function createSectionCalendar(
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
          teachers: true;
        };
      };
      exams: {
        include: {
          examRooms: true;
        };
      };
    };
  }>,
): Promise<ICalCalendar> {
  const calendar = new ICalCalendar({
    name: `${section.course.nameCn} (${section.code})`,
    description: `Calendar for ${section.course.nameCn} (${section.code}), brought to you by Life@USTC`,
    timezone: "Asia/Shanghai",
    url: `https://life-ustc.tiankaima.dev/sections/${section.jwId}`,
    scale: "GREGORIAN",
  });

  // Create events for each schedule
  for (const schedule of section.schedules) {
    await createScheduleEvent(schedule, section, calendar);
  }

  // Create events for each exam
  for (const exam of section.exams) {
    await createExamEvent(exam, section, calendar);
  }

  return calendar;
}

/**
 * Creates an iCal calendar for multiple sections
 */
export async function createMultiSectionCalendar(
  sections: Array<
    Prisma.SectionGetPayload<{
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
    }>
  >,
): Promise<ICalCalendar> {
  const calendar = new ICalCalendar({
    name: "Life @ USTC",
    description:
      "Calendar for subscribed courses, brought to you by Life@USTC <https://life-ustc.tiankaima.dev/>",
    timezone: "Asia/Shanghai",
    url: "https://life-ustc.tiankaima.dev",
    scale: "GREGORIAN",
  });

  // Create events for each section
  for (const section of sections) {
    // Create schedule events
    for (const schedule of section.schedules) {
      await createScheduleEvent(schedule, section, calendar);
    }

    // Create exam events
    for (const exam of section.exams) {
      await createExamEvent(exam, section, calendar);
    }
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
    summary,
    description,
    location: {
      title: location,
      address: location,
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

  const geoData = await getLocationGeo(location);

  // Get building image if room code is available
  const buildingImageUrl =
    exam.examRooms.length > 0
      ? await getBuildingImagePath(exam.examRooms[0].room)
      : null;

  const eventData: Parameters<typeof calendar.createEvent>[0] = {
    start: startDate,
    end: endDate,
    summary,
    description,
    location: {
      title: location,
      address: location,
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
