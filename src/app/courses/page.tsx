import type { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { ViewSwitcher } from "@/components/view-switcher";
import { Link } from "@/i18n/routing";
import {
  addLocalizedNames,
  addLocalizedNamesToArray,
} from "@/lib/localization-helpers";
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

  const [data, filterOptions] = await Promise.all([
    fetchCourses(page, search, educationLevelId, categoryId, classTypeId),
    fetchFilterOptions(),
  ]);
  const { data: courses, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const { educationLevels, categories, classTypes } = filterOptions;

  const t = await getTranslations("courses");
  const tCommon = await getTranslations("common");

  // Add localized names to all courses and their nested objects
  const localizedCourses = addLocalizedNamesToArray(courses, locale).map(
    (course) => ({
      ...course,
      educationLevel: course.educationLevel
        ? addLocalizedNames(course.educationLevel, locale)
        : null,
      category: course.category
        ? addLocalizedNames(course.category, locale)
        : null,
      classType: course.classType
        ? addLocalizedNames(course.classType, locale)
        : null,
    }),
  );

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

  const breadcrumbs = [
    { label: tCommon("home"), href: "/" },
    { label: tCommon("courses") },
  ];

  return (
    <main className="page-main">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={breadcrumbs}
        actions={[<ViewSwitcher key="view-switcher" />]}
      />

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
        view === "table" ? (
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
                {localizedCourses.map((course) => (
                  <ClickableTableRow
                    key={course.jwId}
                    href={`/courses/${course.jwId}`}
                  >
                    <TableCell>
                      {course.namePrimary}
                      {course.nameSecondary && (
                        <div className="text-muted-foreground text-xs">
                          {course.nameSecondary}
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
                          {course.educationLevel.namePrimary}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.category && (
                        <Badge variant="outline">
                          {course.category.namePrimary}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.classType && (
                        <Badge variant="outline">
                          {course.classType.namePrimary}
                        </Badge>
                      )}
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {localizedCourses.map((course) => (
              <Link
                key={course.jwId}
                href={`/courses/${course.jwId}`}
                className="no-underline"
              >
                <Card className="h-full overflow-hidden">
                  <CardHeader>
                    <CardTitle>{course.namePrimary}</CardTitle>
                    {course.nameSecondary && (
                      <CardDescription>{course.nameSecondary}</CardDescription>
                    )}
                  </CardHeader>

                  <CardPanel>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="font-mono">
                        {course.code}
                      </Badge>
                      {course.educationLevel && (
                        <Badge variant="outline">
                          {course.educationLevel.namePrimary}
                        </Badge>
                      )}
                      {course.category && (
                        <Badge variant="outline">
                          {course.category.namePrimary}
                        </Badge>
                      )}
                      {course.classType && (
                        <Badge variant="outline">
                          {course.classType.namePrimary}
                        </Badge>
                      )}
                    </div>
                  </CardPanel>
                </Card>
              </Link>
            ))}
          </div>
        )
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
