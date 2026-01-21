import type { Prisma } from "@prisma/client";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { paginatedCourseQuery } from "@/lib/query-helpers";
import { CoursesFilter } from "./courses-filter";

async function fetchCourses(
  page: number,
  search?: string,
  educationLevelId?: string,
  categoryId?: string,
  classTypeId?: string,
) {
  const where: Prisma.CourseWhereInput = {};

  if (search) {
    where.OR = [
      { nameCn: { contains: search, mode: "insensitive" as const } },
      { nameEn: { contains: search, mode: "insensitive" as const } },
      { code: { contains: search, mode: "insensitive" as const } },
    ];
  }

  if (educationLevelId) {
    const parsed = parseInt(educationLevelId, 10);
    if (!Number.isNaN(parsed)) {
      where.educationLevelId = parsed;
    }
  }

  if (categoryId) {
    const parsed = parseInt(categoryId, 10);
    if (!Number.isNaN(parsed)) {
      where.categoryId = parsed;
    }
  }

  if (classTypeId) {
    const parsed = parseInt(classTypeId, 10);
    if (!Number.isNaN(parsed)) {
      where.classTypeId = parsed;
    }
  }

  return paginatedCourseQuery(page, where);
}

async function fetchFilterOptions() {
  const [educationLevels, categories, classTypes] = await Promise.all([
    prisma.educationLevel.findMany(),
    prisma.courseCategory.findMany(),
    prisma.classType.findMany(),
  ]);
  return { educationLevels, categories, classTypes };
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    educationLevelId?: string;
    categoryId?: string;
    classTypeId?: string;
    view?: string;
  }>;
}) {
  const locale = await getLocale();
  const searchP = await searchParams;
  const page = parseInt(searchP.page || "1", 10);
  const search = searchP.search;
  const educationLevelId = searchP.educationLevelId;
  const categoryId = searchP.categoryId;
  const classTypeId = searchP.classTypeId;
  const view = searchP.view || "table";
  const isEnglish = locale === "en-us";

  const [data, filterOptions] = await Promise.all([
    fetchCourses(page, search, educationLevelId, categoryId, classTypeId),
    fetchFilterOptions(),
  ]);
  const { data: courses, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const { educationLevels, categories, classTypes } = filterOptions;

  const t = await getTranslations("courses");
  const tCommon = await getTranslations("common");

  const buildUrl = (page: number) => {
    const params = new URLSearchParams({
      ...(search && { search }),
      ...(educationLevelId && { educationLevelId }),
      ...(categoryId && { categoryId }),
      ...(classTypeId && { classTypeId }),
      ...(view !== "table" && { view }),
      page: page.toString(),
    });
    return `/courses?${params.toString()}`;
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
            <BreadcrumbPage>{tCommon("courses")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>

      <CoursesFilter
        educationLevels={educationLevels}
        categories={categories}
        classTypes={classTypes}
        defaultValues={{
          search,
          educationLevelId,
          categoryId,
          classTypeId,
        }}
        locale={locale}
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          {t("showing", { count: courses.length, total })}
          {search && (
            <span className="ml-2">{t("searchFor", { query: search })}</span>
          )}
        </p>
      </div>

      {courses.length > 0 ? (
        <div className="mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("courseName")}</TableHead>
                <TableHead>{t("courseCode")}</TableHead>
                <TableHead>{t("educationLevel")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("classType")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <ClickableTableRow
                  key={course.jwId}
                  href={`/courses/${course.jwId}`}
                >
                  <TableCell>
                    {isEnglish && course.nameEn ? course.nameEn : course.nameCn}
                    {isEnglish
                      ? course.nameCn && (
                          <div className="text-muted-foreground text-xs">
                            {course.nameCn}
                          </div>
                        )
                      : course.nameEn && (
                          <div className="text-muted-foreground text-xs">
                            {course.nameEn}
                          </div>
                        )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {course.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {course.educationLevel && (
                      <Badge variant="outline">
                        {course.educationLevel.nameCn}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {course.category && (
                      <Badge variant="outline">{course.category.nameCn}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {course.classType && (
                      <Badge variant="outline">{course.classType.nameCn}</Badge>
                    )}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noCoursesFound")}</EmptyTitle>
            {search && (
              <EmptyDescription>
                {t("searchFor", { query: search })}
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious href={buildUrl(currentPage - 1)} />
              </PaginationItem>
            )}
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
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext href={buildUrl(currentPage + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
}
