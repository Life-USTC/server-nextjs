import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { paginatedSectionQuery } from "@/lib/query-helpers";
import { SectionsFilter } from "./sections-filter";

function parseSearchQuery(search: string): {
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
} {
  const result: {
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
  } = {};

  // Extract special syntax patterns
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

  // Remove special syntax from search string to get general search term
  const generalSearch = search
    .replace(/teacher:\S+/gi, "")
    .replace(/coursecode:\S+/gi, "")
    .replace(/(?:lecturecode|sectioncode):\S+/gi, "")
    .replace(/campus:\S+/gi, "")
    .replace(/credits?:\S+/gi, "")
    .replace(/(?:department|dept):\S+/gi, "")
    .replace(/semester:\S+/gi, "")
    .replace(/category:\S+/gi, "")
    .replace(/(?:level|edulevel):\S+/gi, "")
    .replace(/(?:classtype|type):\S+/gi, "")
    .replace(/(?:sort|sortby):\S+/gi, "")
    .replace(/order:(?:asc|desc)/gi, "")
    .trim();

  if (generalSearch) result.general = generalSearch;

  return result;
}

function buildOrderBy(
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

async function fetchSections(
  page: number,
  semesterId?: string,
  search?: string,
  locale = "zh-cn",
) {
  const where: Prisma.SectionWhereInput = {};
  let orderBy: Prisma.SectionOrderByWithRelationInput | undefined;

  if (semesterId) {
    const parsedSemesterId = parseInt(semesterId, 10);
    if (!Number.isNaN(parsedSemesterId)) {
      where.semesterId = parsedSemesterId;
    }
  }
  if (search) {
    const parsed = parseSearchQuery(search);

    // Build orderBy from sort parameters
    orderBy = buildOrderBy(parsed.sort, parsed.order || "asc");
    const conditions: Prisma.SectionWhereInput[] = [];

    // Teacher search
    if (parsed.teacher) {
      conditions.push({
        teachers: {
          some: {
            nameCn: { contains: parsed.teacher, mode: "insensitive" as const },
          },
        },
      });
    }

    // Course code search
    if (parsed.courseCode) {
      conditions.push({
        course: {
          code: { contains: parsed.courseCode, mode: "insensitive" as const },
        },
      });
    }

    // Lecture/section code search
    if (parsed.lectureCode) {
      conditions.push({
        code: { contains: parsed.lectureCode, mode: "insensitive" as const },
      });
    }

    // Campus search
    if (parsed.campus) {
      conditions.push({
        campus: {
          nameCn: { contains: parsed.campus, mode: "insensitive" as const },
        },
      });
    }

    // Credits search
    if (parsed.credits) {
      const creditsNum = parseFloat(parsed.credits);
      if (!Number.isNaN(creditsNum)) {
        conditions.push({
          credits: creditsNum,
        });
      }
    }

    // Department search
    if (parsed.department) {
      conditions.push({
        openDepartment: {
          nameCn: { contains: parsed.department, mode: "insensitive" as const },
        },
      });
    }

    // Semester search
    if (parsed.semester) {
      conditions.push({
        semester: {
          nameCn: { contains: parsed.semester, mode: "insensitive" as const },
        },
      });
    }

    // Category search
    if (parsed.category) {
      conditions.push({
        course: {
          category: {
            nameCn: { contains: parsed.category, mode: "insensitive" as const },
          },
        },
      });
    }

    // Education level search
    if (parsed.level) {
      conditions.push({
        course: {
          educationLevel: {
            nameCn: { contains: parsed.level, mode: "insensitive" as const },
          },
        },
      });
    }

    // Class type search
    if (parsed.classType) {
      conditions.push({
        course: {
          classType: {
            nameCn: {
              contains: parsed.classType,
              mode: "insensitive" as const,
            },
          },
        },
      });
    }

    // General search (when no special syntax or remaining text)
    if (parsed.general) {
      conditions.push({
        OR: [
          {
            course: {
              nameCn: {
                contains: parsed.general,
                mode: "insensitive" as const,
              },
            },
          },
          {
            course: {
              nameEn: {
                contains: parsed.general,
                mode: "insensitive" as const,
              },
            },
          },
          {
            course: {
              code: { contains: parsed.general, mode: "insensitive" as const },
            },
          },
          { code: { contains: parsed.general, mode: "insensitive" as const } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }
  }

  // Default orderBy if none specified
  if (!orderBy) {
    orderBy = { semester: { jwId: "desc" } };
  }

  return paginatedSectionQuery(page, where, orderBy, locale);
}

async function fetchSemesters() {
  const semesters = await prisma.semester.findMany({
    select: { id: true, nameCn: true },
    take: 100,
    orderBy: { jwId: "desc" },
  });

  return semesters;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.sections"),
  };
}

export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    semesterId?: string;
    search?: string;
    view?: string;
  }>;
}) {
  const locale = await getLocale();
  const searchP = await searchParams;
  const page = parseInt(searchP.page || "1", 10);
  const semesterId = searchP.semesterId;
  const search = searchP.search;
  const view = searchP.view || "table";

  const [data, semesters, t, tCommon] = await Promise.all([
    fetchSections(page, semesterId, search, locale),
    fetchSemesters(),
    getTranslations("sections"),
    getTranslations("common"),
  ]);

  const { data: sections, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const selectedSemester = semesters.find(
    (s) => s.id.toString() === semesterId,
  );

  const buildUrl = (page: number) => {
    const params = new URLSearchParams({
      ...(semesterId && { semesterId }),
      ...(search && { search }),
      ...(view !== "table" && { view }),
      page: page.toString(),
    });
    return `/sections?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("ellipsis");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tCommon("sections")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("title")}</h1>
        <p className="text-muted-foreground text-subtitle">{t("subtitle")}</p>
      </div>

      <SectionsFilter
        semesters={semesters}
        defaultValues={{ search, semesterId }}
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          {t("showing", { count: sections.length, total })}
          {search ? (
            <span className="ml-2">{t("searchFor", { query: search })}</span>
          ) : null}
          {selectedSemester ? (
            <span className="ml-2">
              {t("inSemester", { semester: selectedSemester.nameCn })}
            </span>
          ) : null}
        </p>
      </div>

      {sections.length > 0 ? (
        <div className="mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("semester")}</TableHead>
                <TableHead>{t("courseName")}</TableHead>
                <TableHead>{t("sectionCode")}</TableHead>
                <TableHead>{t("teachers")}</TableHead>
                <TableHead>{t("credits")}</TableHead>
                <TableHead>{t("capacity")}</TableHead>
                <TableHead>{t("campus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <ClickableTableRow
                  key={section.jwId}
                  href={`/sections/${section.jwId}`}
                >
                  <TableCell>
                    {section.semester ? (
                      <Badge variant="outline">{section.semester.nameCn}</Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{section.course.namePrimary}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {section.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[12ch] truncate"
                      title={
                        section.teachers && section.teachers.length > 0
                          ? section.teachers
                              .map((teacher) => teacher.namePrimary)
                              .join(", ")
                          : undefined
                      }
                    >
                      {section.teachers && section.teachers.length > 0
                        ? section.teachers
                            .map((teacher) => teacher.namePrimary)
                            .join(", ")
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {section.credits !== null ? section.credits : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {section.stdCount ?? 0} / {section.limitCount ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {section.campus ? section.campus.namePrimary : "—"}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noSectionsFound")}</EmptyTitle>
            {search ? (
              <EmptyDescription>
                {t("searchFor", { query: search })}
              </EmptyDescription>
            ) : null}
            {selectedSemester ? (
              <EmptyDescription>
                {t("inSemester", { semester: selectedSemester.nameCn })}
              </EmptyDescription>
            ) : null}
          </EmptyHeader>
        </Empty>
      )}

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            {currentPage > 1 ? (
              <PaginationItem>
                <PaginationPrevious href={buildUrl(currentPage - 1)} />
              </PaginationItem>
            ) : null}
            {getPageNumbers().map((pageNum, index) => (
              <PaginationItem
                key={pageNum === "ellipsis" ? `ellipsis-${index}` : pageNum}
              >
                {pageNum === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href={buildUrl(pageNum)}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            {currentPage < totalPages ? (
              <PaginationItem>
                <PaginationNext href={buildUrl(currentPage + 1)} />
              </PaginationItem>
            ) : null}
          </PaginationContent>
        </Pagination>
      ) : null}
    </main>
  );
}
