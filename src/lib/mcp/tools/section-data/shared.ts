import type { Prisma } from "@/generated/prisma/client";
import { jsonToolResult, resolveMcpMode } from "@/lib/mcp/tools/_helpers";

export const sectionScheduleInclude = {
  room: {
    include: {
      building: {
        include: {
          campus: true,
        },
      },
      roomType: true,
    },
  },
  teachers: {
    include: {
      department: true,
    },
  },
  section: {
    include: {
      course: true,
      semester: true,
    },
  },
  scheduleGroup: true,
} satisfies Prisma.ScheduleInclude;

export const sectionScheduleListInclude = {
  room: {
    include: {
      building: {
        include: {
          campus: true,
        },
      },
      roomType: true,
    },
  },
  teachers: {
    include: {
      department: true,
    },
  },
  section: {
    include: {
      course: true,
    },
  },
  scheduleGroup: true,
} satisfies Prisma.ScheduleInclude;

export const sectionExamInclude = {
  examBatch: true,
  examRooms: true,
  section: {
    include: {
      course: true,
    },
  },
} satisfies Prisma.ExamInclude;

export function sectionNotFoundToolResult(
  sectionJwId: number,
  mode?: "summary" | "default" | "full",
) {
  return jsonToolResult(
    {
      found: false,
      message: `Section ${sectionJwId} was not found`,
    },
    mode === undefined ? undefined : { mode: resolveMcpMode(mode) },
  );
}
