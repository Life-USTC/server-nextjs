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

type SectionSearchStringKey = Exclude<
  keyof ParsedSectionSearchQuery,
  "general" | "order"
>;
type SectionSearchConditionKey = Exclude<
  keyof ParsedSectionSearchQuery,
  "general" | "sort" | "order"
>;

const SECTION_SEARCH_FIELDS: Array<{
  key: SectionSearchStringKey;
  pattern: RegExp;
}> = [
  { key: "teacher", pattern: /teacher:(\S+)/i },
  { key: "courseCode", pattern: /coursecode:(\S+)/i },
  { key: "lectureCode", pattern: /(?:lecturecode|sectioncode):(\S+)/i },
  { key: "campus", pattern: /campus:(\S+)/i },
  { key: "credits", pattern: /credits?:(\S+)/i },
  { key: "department", pattern: /(?:department|dept):(\S+)/i },
  { key: "semester", pattern: /semester:(\S+)/i },
  { key: "category", pattern: /category:(\S+)/i },
  { key: "level", pattern: /(?:level|edulevel):(\S+)/i },
  { key: "classType", pattern: /(?:classtype|type):(\S+)/i },
  { key: "sort", pattern: /(?:sort|sortby):(\S+)/i },
];

const SECTION_SEARCH_TAG_PATTERN =
  /\b(?:teacher|coursecode|lecturecode|sectioncode|campus|credits?|department|dept|semester|category|level|edulevel|classtype|type|sort|sortby|order):\S+/gi;

const SECTION_SEARCH_CONDITIONS: Array<{
  key: SectionSearchConditionKey;
  build: (value: string) => Prisma.SectionWhereInput | undefined;
}> = [
  {
    key: "teacher",
    build: (value) => ({ teachers: { some: { nameCn: ilike(value) } } }),
  },
  { key: "courseCode", build: (value) => ({ course: { code: ilike(value) } }) },
  { key: "lectureCode", build: (value) => ({ code: ilike(value) }) },
  { key: "campus", build: (value) => ({ campus: { nameCn: ilike(value) } }) },
  {
    key: "credits",
    build: (value) => {
      const credits = Number(value);
      return Number.isFinite(credits) ? { credits } : undefined;
    },
  },
  {
    key: "department",
    build: (value) => ({ openDepartment: { nameCn: ilike(value) } }),
  },
  {
    key: "semester",
    build: (value) => ({ semester: { nameCn: ilike(value) } }),
  },
  {
    key: "category",
    build: (value) => ({ course: { category: { nameCn: ilike(value) } } }),
  },
  {
    key: "level",
    build: (value) => ({
      course: { educationLevel: { nameCn: ilike(value) } },
    }),
  },
  {
    key: "classType",
    build: (value) => ({ course: { classType: { nameCn: ilike(value) } } }),
  },
];

export function parseSectionSearchQuery(
  search: string,
): ParsedSectionSearchQuery {
  const result: ParsedSectionSearchQuery = {};

  for (const field of SECTION_SEARCH_FIELDS) {
    const match = search.match(field.pattern);
    if (match) {
      result[field.key] = match[1];
    }
  }

  const orderMatch = search.match(/order:(asc|desc)/i);

  if (orderMatch) result.order = orderMatch[1].toLowerCase() as "asc" | "desc";

  const generalSearch = search.replace(SECTION_SEARCH_TAG_PATTERN, "").trim();

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
  const conditions = SECTION_SEARCH_CONDITIONS.flatMap((field) => {
    const value = parsed[field.key];
    const condition = value ? field.build(value) : undefined;
    return condition ? [condition] : [];
  });

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
  pageSize?: number,
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
    pageSize,
  );
}

export function paginatedCourseQuery(
  page: number,
  pageSize?: number,
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
    pageSize,
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
  pageSize?: number,
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
    pageSize,
  );
}
