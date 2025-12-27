import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    educationLevelId?: string;
    categoryId?: string;
    classTypeId?: string;
  }>;
}) {
  const { locale } = await params;
  const searchP = await searchParams;
  const page = parseInt(searchP.page || "1", 10);
  const search = searchP.search;
  const educationLevelId = searchP.educationLevelId;
  const categoryId = searchP.categoryId;
  const classTypeId = searchP.classTypeId;
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
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tCommon("courses")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-display mb-4">{t("title")}</h1>
      <p className="text-subtitle mb-8">{t("subtitle")}</p>

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
        <p className="text-muted">
          {t("showing", { count: courses.length, total })}
          {search && (
            <span className="ml-2">{t("searchFor", { query: search })}</span>
          )}
        </p>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="block p-6 bg-surface-elevated rounded-lg border border-base hover:border-interactive-hover transition-colors no-underline hover:no-underline focus-visible:no-underline"
            >
              <div className="mb-3">
                <h3 className="text-subtitle text-emphasis mb-1">
                  {isEnglish && course.nameEn ? course.nameEn : course.nameCn}
                </h3>
                {isEnglish
                  ? course.nameCn && (
                      <p className="text-small text-muted">{course.nameCn}</p>
                    )
                  : course.nameEn && (
                      <p className="text-small text-muted">{course.nameEn}</p>
                    )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-tag tag-base tag-section-code font-mono">
                  {course.code}
                </span>
                {course.educationLevel && (
                  <span className="text-tag tag-base tag-education-level">
                    {course.educationLevel.nameCn}
                  </span>
                )}
                {course.category && (
                  <span className="text-tag tag-base tag-category">
                    {course.category.nameCn}
                  </span>
                )}
                {course.classType && (
                  <span className="text-tag tag-base tag-class-type">
                    {course.classType.nameCn}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted">
            {t("noCoursesFound")}
            {search && <span> {t("searchFor", { query: search })}</span>}
          </p>
        </div>
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
