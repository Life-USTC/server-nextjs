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
import { getPrisma } from "@/lib/prisma";
import { paginatedCourseQuery } from "@/lib/query-helpers";
import { CoursesFilter } from "./courses-filter";

async function fetchCourses(
  page: number,
  search?: string,
  educationLevelId?: string,
  categoryId?: string,
  classTypeId?: string,
  locale = "zh-cn",
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

  return paginatedCourseQuery(page, where, undefined, locale);
}

async function fetchFilterOptions(locale: string) {
  const prisma = getPrisma(locale);
  const [educationLevels, categories, classTypes] = await Promise.all([
    prisma.educationLevel.findMany(),
    prisma.courseCategory.findMany(),
    prisma.classType.findMany(),
  ]);
  const toFilterOption = (item: {
    id: number;
    namePrimary: string;
    nameSecondary: string | null;
  }) => ({
    id: item.id,
    namePrimary: item.namePrimary,
    nameSecondary: item.nameSecondary,
  });

  return {
    educationLevels: educationLevels.map(toFilterOption),
    categories: categories.map(toFilterOption),
    classTypes: classTypes.map(toFilterOption),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.courses"),
  };
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

  const [data, filterOptions, t, tCommon] = await Promise.all([
    fetchCourses(
      page,
      search,
      educationLevelId,
      categoryId,
      classTypeId,
      locale,
    ),
    fetchFilterOptions(locale),
    getTranslations("courses"),
    getTranslations("common"),
  ]);
  const { data: courses, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const { educationLevels, categories, classTypes } = filterOptions;

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

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("title")}</h1>
        <p className="text-muted-foreground text-subtitle">{t("subtitle")}</p>
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
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          {t("showing", { count: courses.length, total })}
          {search ? (
            <span className="ml-2">{t("searchFor", { query: search })}</span>
          ) : null}
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
                    {course.namePrimary}
                    {course.nameSecondary ? (
                      <div className="text-muted-foreground text-xs">
                        {course.nameSecondary}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {course.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {course.educationLevel ? (
                      <Badge variant="outline">
                        {course.educationLevel.namePrimary}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {course.category ? (
                      <Badge variant="outline">
                        {course.category.namePrimary}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {course.classType ? (
                      <Badge variant="outline">
                        {course.classType.namePrimary}
                      </Badge>
                    ) : null}
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
            {search ? (
              <EmptyDescription>
                {t("searchFor", { query: search })}
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
