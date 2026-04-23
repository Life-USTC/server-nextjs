import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { DataState } from "@/components/data-state";
import {
  PageBreadcrumbs,
  PageLayout,
  PageMeta,
  PageSection,
} from "@/components/page-layout";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { buildSearchParams } from "@/lib/navigation/search-params";
import { ilike, paginatedCourseQuery } from "@/lib/query-helpers";
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
      { nameCn: ilike(search) },
      { nameEn: ilike(search) },
      { code: ilike(search) },
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
    const query = buildSearchParams({
      values: {
        search,
        educationLevelId,
        categoryId,
        classTypeId,
        view: view !== "table" ? view : "",
        page: page > 1 ? String(page) : "",
      },
    });
    return query ? `/courses?${query}` : "/courses";
  };

  return (
    <PageLayout
      title={t("title")}
      description={t("subtitle")}
      breadcrumbs={
        <PageBreadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tCommon("courses") },
          ]}
        />
      }
    >
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

      <PageMeta>
        {t("showing", { count: courses.length, total })}
        {search ? (
          <span className="ml-2">{t("searchFor", { query: search })}</span>
        ) : null}
      </PageMeta>

      <PageSection className="overflow-hidden">
        <DataState
          empty={courses.length === 0}
          emptyTitle={t("noCoursesFound")}
          emptyDescription={search ? t("searchFor", { query: search }) : null}
        >
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
        </DataState>
      </PageSection>

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        buildUrl={buildUrl}
      />
    </PageLayout>
  );
}
