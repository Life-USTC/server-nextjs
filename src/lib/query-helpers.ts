import type { Prisma } from "@/generated/prisma/client";
import {
  buildPaginatedResponse,
  normalizePagination,
  type PaginatedResponse,
} from "@/lib/api/helpers";
import { getPrisma } from "@/lib/db/prisma";

/** Case-insensitive string contains filter for Prisma queries. */
export function ilike(value: string): {
  contains: string;
  mode: "insensitive";
} {
  return { contains: value, mode: "insensitive" };
}

/**
 * Generic paginated query function for Prisma models
 */
export async function paginatedQuery<TData>(
  queryFn: (skip: number, take: number) => Promise<TData[]>,
  countFn: () => Promise<number>,
  page: number,
  pageSize?: number,
): Promise<PaginatedResponse<TData>> {
  const normalized = normalizePagination({ page, pageSize });

  const [data, total] = await Promise.all([
    queryFn(normalized.skip, normalized.pageSize),
    countFn(),
  ]);

  return buildPaginatedResponse(
    data,
    normalized.page,
    normalized.pageSize,
    total,
  );
}

/**
 * Lightweight section include for list/match scenarios
 */
export const sectionCompactInclude = {
  course: {
    include: {
      educationLevel: true,
      category: true,
      classify: true,
      classType: true,
      gradation: true,
      type: true,
    },
  },
  semester: true,
  campus: true,
  openDepartment: true,
  teachers: true,
} satisfies Prisma.SectionInclude;

/**
 * Helper to build common include objects for sections
 */
export const sectionInclude = {
  course: {
    include: {
      educationLevel: true,
      category: true,
      classify: true,
      classType: true,
      gradation: true,
      type: true,
    },
  },
  semester: true,
  campus: true,
  openDepartment: true,
  examMode: true,
  teachLanguage: true,
  teachers: true,
  adminClasses: true,
} satisfies Prisma.SectionInclude;

/**
 * Helper to build common include objects for courses
 */
export const courseInclude = {
  educationLevel: true,
  category: true,
  classify: true,
  classType: true,
  gradation: true,
  type: true,
} satisfies Prisma.CourseInclude;

export const courseDetailInclude = {
  ...courseInclude,
  sections: {
    include: {
      semester: true,
      campus: true,
      teachers: true,
    },
    orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
  },
} satisfies Prisma.CourseInclude;

type ParsedSectionSearchQuery = {
  teacher?: string;
  courseCode?: string;
  lectureCode?: string;
  campus?: string;
  credits?: string;
  department?: string;
  semester?: string;
  category?: string;
  level?: string;
  classType?: string;
  sort?: string;
  order?: "asc" | "desc";
  general?: string;
};

export function parseSectionSearchQuery(
  search: string,
): ParsedSectionSearchQuery {
  const result: ParsedSectionSearchQuery = {};

  const teacherMatch = search.match(/teacher:(\S+)/i);
  const courseCodeMatch = search.match(/coursecode:(\S+)/i);
  const lectureCodeMatch = search.match(/(?:lecturecode|sectioncode):(\S+)/i);
  const campusMatch = search.match(/campus:(\S+)/i);
  const creditsMatch = search.match(/credits?:(\S+)/i);
  const departmentMatch = search.match(/(?:department|dept):(\S+)/i);
  const semesterMatch = search.match(/semester:(\S+)/i);
  const categoryMatch = search.match(/category:(\S+)/i);
  const levelMatch = search.match(/(?:level|edulevel):(\S+)/i);
  const classTypeMatch = search.match(/(?:classtype|type):(\S+)/i);
  const sortMatch = search.match(/(?:sort|sortby):(\S+)/i);
  const orderMatch = search.match(/order:(asc|desc)/i);

  if (teacherMatch) result.teacher = teacherMatch[1];
  if (courseCodeMatch) result.courseCode = courseCodeMatch[1];
  if (lectureCodeMatch) result.lectureCode = lectureCodeMatch[1];
  if (campusMatch) result.campus = campusMatch[1];
  if (creditsMatch) result.credits = creditsMatch[1];
  if (departmentMatch) result.department = departmentMatch[1];
  if (semesterMatch) result.semester = semesterMatch[1];
  if (categoryMatch) result.category = categoryMatch[1];
  if (levelMatch) result.level = levelMatch[1];
  if (classTypeMatch) result.classType = classTypeMatch[1];
  if (sortMatch) result.sort = sortMatch[1];
  if (orderMatch) result.order = orderMatch[1].toLowerCase() as "asc" | "desc";

  const generalSearch = search
    .replace(
      /\b(?:teacher|coursecode|lecturecode|sectioncode|campus|credits?|department|dept|semester|category|level|edulevel|classtype|type|sort|sortby|order):\S+/gi,
      "",
    )
    .trim();

  if (generalSearch) result.general = generalSearch;

  return result;
}

export function buildSectionOrderBy(
  sortField?: string,
  order: "asc" | "desc" = "asc",
): Prisma.SectionOrderByWithRelationInput | undefined {
  if (!sortField) return undefined;

  const sortMap: Record<string, Prisma.SectionOrderByWithRelationInput> = {
    credits: { credits: order },
    credit: { credits: order },
    capacity: { stdCount: order },
    semester: { semester: { jwId: order } },
    course: { course: { nameCn: order } },
    coursename: { course: { nameCn: order } },
    code: { code: order },
    sectioncode: { code: order },
    teacher: { teachers: { _count: order } },
    campus: { campus: { nameCn: order } },
  };

  return sortMap[sortField.toLowerCase()];
}

export function buildSectionSearchWhere(search?: string): {
  where?: Prisma.SectionWhereInput;
  orderBy?: Prisma.SectionOrderByWithRelationInput;
} {
  if (!search) {
    return {};
  }

  const parsed = parseSectionSearchQuery(search);
  const orderBy = buildSectionOrderBy(parsed.sort, parsed.order || "asc");
  const conditions: Prisma.SectionWhereInput[] = [];

  if (parsed.teacher) {
    conditions.push({
      teachers: {
        some: {
          nameCn: ilike(parsed.teacher),
        },
      },
    });
  }

  if (parsed.courseCode) {
    conditions.push({
      course: {
        code: ilike(parsed.courseCode),
      },
    });
  }

  if (parsed.lectureCode) {
    conditions.push({
      code: ilike(parsed.lectureCode),
    });
  }

  if (parsed.campus) {
    conditions.push({
      campus: {
        nameCn: ilike(parsed.campus),
      },
    });
  }

  if (parsed.credits) {
    const creditsNum = parseFloat(parsed.credits);
    if (!Number.isNaN(creditsNum)) {
      conditions.push({
        credits: creditsNum,
      });
    }
  }

  if (parsed.department) {
    conditions.push({
      openDepartment: {
        nameCn: ilike(parsed.department),
      },
    });
  }

  if (parsed.semester) {
    conditions.push({
      semester: {
        nameCn: ilike(parsed.semester),
      },
    });
  }

  if (parsed.category) {
    conditions.push({
      course: {
        category: {
          nameCn: ilike(parsed.category),
        },
      },
    });
  }

  if (parsed.level) {
    conditions.push({
      course: {
        educationLevel: {
          nameCn: ilike(parsed.level),
        },
      },
    });
  }

  if (parsed.classType) {
    conditions.push({
      course: {
        classType: {
          nameCn: ilike(parsed.classType),
        },
      },
    });
  }

  if (parsed.general) {
    conditions.push({
      OR: [
        {
          course: {
            nameCn: ilike(parsed.general),
          },
        },
        {
          course: {
            nameEn: ilike(parsed.general),
          },
        },
        {
          course: {
            code: ilike(parsed.general),
          },
        },
        {
          code: ilike(parsed.general),
        },
      ],
    });
  }

  return {
    where: conditions.length > 0 ? { AND: conditions } : undefined,
    orderBy,
  };
}

export function paginatedSectionQuery(
  page: number,
  where?: Prisma.SectionWhereInput,
  orderBy?:
    | Prisma.SectionOrderByWithRelationInput
    | Prisma.SectionOrderByWithRelationInput[],
  locale = "zh-cn",
) {
  const prisma = getPrisma(locale);
  return paginatedQuery(
    (skip, take) =>
      prisma.section.findMany({
        where,
        skip,
        take,
        include: sectionInclude,
        orderBy,
      }),
    () => prisma.section.count({ where }),
    page,
  );
}

export function paginatedCourseQuery(
  page: number,
  where?: Prisma.CourseWhereInput,
  orderBy?:
    | Prisma.CourseOrderByWithRelationInput
    | Prisma.CourseOrderByWithRelationInput[],
  locale = "zh-cn",
) {
  const prisma = getPrisma(locale);
  return paginatedQuery(
    (skip, take) =>
      prisma.course.findMany({
        where,
        skip,
        take,
        include: courseInclude,
        orderBy,
      }),
    () => prisma.course.count({ where }),
    page,
  );
}

/**
 * Lightweight include for teacher list pages (no sections data, only count)
 */
export const teacherListInclude = {
  department: true,
  teacherTitle: true,
  _count: {
    select: {
      sections: true,
    },
  },
} satisfies Prisma.TeacherInclude;

/**
 * Full include for teacher detail pages (includes all sections)
 */
export const teacherDetailInclude = {
  department: true,
  teacherTitle: true,
  sections: {
    include: {
      course: {
        include: courseInclude,
      },
      semester: true,
    },
    orderBy: [
      { semester: { jwId: "desc" as const } },
      { course: { nameCn: "asc" as const } },
    ],
  },
  _count: {
    select: {
      sections: true,
    },
  },
} satisfies Prisma.TeacherInclude;

export function paginatedTeacherQuery(
  page: number,
  where?: Prisma.TeacherWhereInput,
  orderBy?:
    | Prisma.TeacherOrderByWithRelationInput
    | Prisma.TeacherOrderByWithRelationInput[],
  locale = "zh-cn",
) {
  const prisma = getPrisma(locale);
  return paginatedQuery(
    (skip, take) =>
      prisma.teacher.findMany({
        where,
        skip,
        take,
        include: teacherListInclude,
        orderBy,
      }),
    () => prisma.teacher.count({ where }),
    page,
  );
}
