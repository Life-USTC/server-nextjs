import type { Prisma, Semester } from "@prisma/client";
import { getTranslations } from "next-intl/server";
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
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
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
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { paginatedSectionQuery } from "@/lib/query-helpers";
import { SectionsFilter } from "./sections-filter";

function parseSearchQuery(search: string): {
  teacher?: string;
  courseCode?: string;
  lectureCode?: string;
  general?: string;
} {
  const result: {
    teacher?: string;
    courseCode?: string;
    lectureCode?: string;
    general?: string;
  } = {};

  // Extract special syntax patterns
  const teacherMatch = search.match(/teacher:(\S+)/i);
  const courseCodeMatch = search.match(/coursecode:(\S+)/i);
  const lectureCodeMatch = search.match(/(?:lecturecode|sectioncode):(\S+)/i);

  if (teacherMatch) result.teacher = teacherMatch[1];
  if (courseCodeMatch) result.courseCode = courseCodeMatch[1];
  if (lectureCodeMatch) result.lectureCode = lectureCodeMatch[1];

  // Remove special syntax from search string to get general search term
  const generalSearch = search
    .replace(/teacher:\S+/gi, "")
    .replace(/coursecode:\S+/gi, "")
    .replace(/(?:lecturecode|sectioncode):\S+/gi, "")
    .trim();

  if (generalSearch) result.general = generalSearch;

  return result;
}

async function fetchSections(
  page: number,
  semesterId?: string,
  search?: string,
) {
  const where: Prisma.SectionWhereInput = {};
  if (semesterId) {
    const parsedSemesterId = parseInt(semesterId, 10);
    if (!Number.isNaN(parsedSemesterId)) {
      where.semesterId = parsedSemesterId;
    }
  }
  if (search) {
    const parsed = parseSearchQuery(search);
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

    // If we have any conditions, combine them with AND
    if (conditions.length > 0) {
      where.AND = conditions;
    }
  }

  return paginatedSectionQuery(page, where);
}

async function fetchSemesters(): Promise<Semester[]> {
  const semesters = await prisma.semester.findMany({
    take: 100,
    orderBy: { name: "desc" },
  });

  return semesters;
}

export default async function SectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    semesterId?: string;
    search?: string;
  }>;
}) {
  const { locale } = await params;
  const searchP = await searchParams;
  const page = parseInt(searchP.page || "1", 10);
  const semesterId = searchP.semesterId;
  const search = searchP.search;
  const isEnglish = locale === "en-us";

  const [data, semesters] = await Promise.all([
    fetchSections(page, semesterId, search),
    fetchSemesters(),
  ]);

  const { data: sections, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const selectedSemester = semesters.find(
    (s) => s.id.toString() === semesterId,
  );

  const t = await getTranslations("sections");
  const tCommon = await getTranslations("common");

  const buildUrl = (page: number) => {
    const params = new URLSearchParams({
      ...(semesterId && { semesterId }),
      ...(search && { search }),
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
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tCommon("sections")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>

      <SectionsFilter
        semesters={semesters}
        defaultValues={{ search, semesterId }}
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          {t("showing", { count: sections.length, total })}
          {search && (
            <span className="ml-2">{t("searchFor", { query: search })}</span>
          )}
          {selectedSemester && (
            <span className="ml-2">
              {t("inSemester", { semester: selectedSemester.name })}
            </span>
          )}
        </p>
      </div>

      {sections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/sections/${section.id}`}
              className="no-underline"
            >
              <Card className="h-full overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    {isEnglish && section.course.nameEn
                      ? section.course.nameEn
                      : section.course.nameCn}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {section.semester && (
                        <Badge variant="outline">{section.semester.name}</Badge>
                      )}
                      <Badge variant="outline" className="font-mono">
                        {section.code}
                      </Badge>
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardPanel>
                  <div className="flex flex-col gap-3">
                    {section.teachers && section.teachers.length > 0 && (
                      <p className="text-body text-foreground">
                        <strong className="text-foreground font-semibold">
                          {t("teachers")}:
                        </strong>{" "}
                        {section.teachers
                          .map((teacher) => teacher.nameCn)
                          .join(", ")}
                      </p>
                    )}
                    {section.campus && (
                      <p className="text-body text-foreground">
                        <strong className="text-foreground font-semibold">
                          {t("campus")}:
                        </strong>{" "}
                        {section.campus.nameCn}
                      </p>
                    )}
                    {section.openDepartment && (
                      <p className="text-body text-foreground">
                        <strong className="text-foreground font-semibold">
                          {t("department")}:
                        </strong>{" "}
                        {section.openDepartment.nameCn}
                      </p>
                    )}
                    {section.credits !== null && (
                      <p className="text-body text-foreground">
                        <strong className="text-foreground font-semibold">
                          {t("credits")}:
                        </strong>{" "}
                        {section.credits}
                      </p>
                    )}
                    <p className="text-body text-foreground">
                      <strong className="text-foreground font-semibold">
                        {t("capacity")}:
                      </strong>{" "}
                      <Badge variant="outline">
                        {section.stdCount ?? 0} / {section.limitCount ?? "—"}
                      </Badge>
                    </p>
                  </div>
                </CardPanel>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noSectionsFound")}</EmptyTitle>
            {search && (
              <EmptyDescription>
                {t("searchFor", { query: search })}
              </EmptyDescription>
            )}
            {selectedSemester && (
              <EmptyDescription>
                {t("inSemester", { semester: selectedSemester.name })}
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={buildUrl(currentPage - 1)} />
            </PaginationItem>
            {getPageNumbers().map((pageNum) => (
              <PaginationItem
                key={pageNum === "ellipsis" ? "ellipsis" : pageNum}
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
            <PaginationItem>
              <PaginationNext href={buildUrl(currentPage + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
}
