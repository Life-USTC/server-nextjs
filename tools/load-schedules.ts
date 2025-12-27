import type {
  PrismaClient,
  Room,
  ScheduleGroup,
  Teacher,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface CampusInterface {
  id: number;
  nameZh: string;
  nameEn: string | null;
  code: string;
}

interface BuildingInterface {
  id: number;
  nameZh: string;
  nameEn: string | null;
  code: string;
  campus: CampusInterface;
}

interface RoomTypeInterface {
  id: number;
  nameZh: string;
  nameEn: string | null;
  code: string;
}

interface RoomInterface {
  id: number;
  nameZh: string;
  nameEn: string | null;
  code: string;
  building: BuildingInterface;
  roomType: RoomTypeInterface;
  floor: number;
  virtual: boolean;
  seatsForLesson: number;
  remark: string | null;
  seats: number;
}

interface ScheduleInterface {
  lessonId: number;
  scheduleGroupId: number;
  periods: number;
  date: string;
  room: RoomInterface;
  weekday: number;
  startTime: number;
  endTime: number;
  teacherId: number | null;
  personId: number | null;
  personName: string;
  experiment: string | null;
  customPlace: string | null;
  lessonType: string | null;
  weekIndex: number;
  exerciseClass: boolean | null;
  startUnit: number;
  endUnit: number;
}

interface ScheduleGroupInterface {
  id: number;
  lessonId: number;
  no: number;
  limitCount: number;
  stdCount: number;
  actualPeriods: number;
  default: boolean;
}

export interface ScheduleDataInterface {
  result: {
    scheduleList: ScheduleInterface[];
    scheduleGroupList: ScheduleGroupInterface[];
  };
}

async function loadRoom(
  data: RoomInterface,
  prisma: PrismaClient,
): Promise<Room | null> {
  if (!data || !data.building || !data.roomType) {
    return null;
  }

  const campus = await prisma.campus.upsert({
    where: { nameCn: data.building.campus.nameZh },
    update: {
      nameCn: data.building.campus.nameZh,
      nameEn: data.building.campus.nameEn,
    },
    create: {
      jwId: data.building.campus.id,
      nameCn: data.building.campus.nameZh,
      nameEn: data.building.campus.nameEn,
    },
  });

  const building = await prisma.building.upsert({
    where: { jwId: data.building.id },
    update: {
      code: data.building.code,
      nameCn: data.building.nameZh,
      nameEn: data.building.nameEn,
      campusId: campus.id,
    },
    create: {
      jwId: data.building.id,
      code: data.building.code,
      nameCn: data.building.nameZh,
      nameEn: data.building.nameEn,
      campusId: campus.id,
    },
  });

  const roomType = await prisma.roomType.upsert({
    where: { jwId: data.roomType.id },
    update: {
      code: data.roomType.code,
      nameCn: data.roomType.nameZh,
      nameEn: data.roomType.nameEn,
    },
    create: {
      jwId: data.roomType.id,
      code: data.roomType.code,
      nameCn: data.roomType.nameZh,
      nameEn: data.roomType.nameEn,
    },
  });

  const room = await prisma.room.upsert({
    where: { jwId: data.id },
    update: {
      code: data.code,
      nameCn: data.nameZh,
      nameEn: data.nameEn,
      floor: data.floor,
      virtual: data.virtual,
      seatsForSection: data.seatsForLesson,
      remark: data.remark,
      seats: data.seats,
      buildingId: building.id,
      roomTypeId: roomType.id,
    },
    create: {
      jwId: data.id,
      code: data.code,
      nameCn: data.nameZh,
      nameEn: data.nameEn,
      floor: data.floor,
      virtual: data.virtual,
      seatsForSection: data.seatsForLesson,
      remark: data.remark,
      seats: data.seats,
      buildingId: building.id,
      roomTypeId: roomType.id,
    },
  });

  return room;
}

async function loadTeacher(
  teacherId: number | null,
  personId: number | null,
  personName: string,
  prisma: PrismaClient,
): Promise<Teacher | null> {
  let teacher = null;

  if (personId) {
    teacher = await prisma.teacher.findFirst({
      where: { personId },
    });
  }

  if (!teacher && teacherId) {
    teacher = await prisma.teacher.findFirst({
      where: { teacherId },
    });
  }

  if (!teacher) {
    teacher = await prisma.teacher.findFirst({
      where: {
        nameCn: personName,
        teacherId: null,
        personId: null,
      },
    });
  }

  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        personId,
        teacherId,
        nameCn: personName,
      },
    });
  } else {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        personId: personId || teacher.personId,
        teacherId: teacherId || teacher.teacherId,
        nameCn: personName,
      },
    });
    teacher = await prisma.teacher.findUnique({
      where: { id: teacher.id },
    });
  }

  return teacher;
}

async function loadScheduleGroup(
  data: ScheduleGroupInterface,
  sectionId: number,
  prisma: PrismaClient,
): Promise<ScheduleGroup> {
  const scheduleGroup = await prisma.scheduleGroup.upsert({
    where: { jwId: data.id },
    update: {
      sectionId,
      no: data.no,
      limitCount: data.limitCount,
      stdCount: data.stdCount,
      actualPeriods: data.actualPeriods,
      isDefault: data.default,
    },
    create: {
      jwId: data.id,
      sectionId,
      no: data.no,
      limitCount: data.limitCount,
      stdCount: data.stdCount,
      actualPeriods: data.actualPeriods,
      isDefault: data.default,
    },
  });
  return scheduleGroup;
}

async function loadSchedule(data: ScheduleInterface, sectionId: number) {
  const room = await loadRoom(data.room, prisma);

  const teacher = await loadTeacher(
    data.teacherId || null,
    data.personId || null,
    data.personName || "未知教师",
    prisma,
  );

  const scheduleGroup = await prisma.scheduleGroup.findFirst({
    where: { jwId: data.scheduleGroupId },
  });

  if (!scheduleGroup) {
    return;
  }

  return prisma.schedule.create({
    data: {
      sectionId,
      scheduleGroupId: scheduleGroup.id,
      roomId: room?.id || null,
      teacherId: teacher?.id || null,
      periods: data.periods,
      date: new Date(data.date),
      weekday: data.weekday,
      startTime: data.startTime,
      endTime: data.endTime,
      experiment: data.experiment || null,
      customPlace: data.customPlace || null,
      lessonType: data.lessonType || null,
      weekIndex: data.weekIndex,
      exerciseClass: data.exerciseClass || false,
      startUnit: data.startUnit,
      endUnit: data.endUnit,
    },
  });
}

export async function loadSchedules(
  data: ScheduleDataInterface,
  sectionId: number,
  prisma: PrismaClient,
) {
  const result = data.result;
  await prisma.schedule.deleteMany({ where: { sectionId } });

  for (const groupData of result.scheduleGroupList || []) {
    await loadScheduleGroup(groupData, sectionId, prisma);
  }

  for (const scheduleData of result.scheduleList || []) {
    await loadSchedule(scheduleData, sectionId);
  }
}
