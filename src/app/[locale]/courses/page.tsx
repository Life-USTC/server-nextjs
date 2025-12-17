import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/breadcrumb";
import Pagination from "@/components/pagination";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { paginatedCourseQuery } from "@/lib/query-helpers";

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
    prisma.educationLevel.findMany({ orderBy: { nameCn: "asc" } }),
    prisma.courseCategory.findMany({ orderBy: { nameCn: "asc" } }),
    prisma.classType.findMany({ orderBy: { nameCn: "asc" } }),
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

  const breadcrumbItems = [
    { label: tCommon("home"), href: "/" },
    { label: tCommon("courses") },
  ];

  return (
    <main className="page-main">
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="text-display mb-4">{t("title")}</h1>
      <p className="text-subtitle mb-8">{t("subtitle")}</p>

      <form method="get" className="mb-8">
        <div className="flex flex-wrap gap-2">
          <select
            name="educationLevelId"
            defaultValue={educationLevelId || ""}
            className="px-4 py-2 bg-surface-elevated border border-base rounded-lg hover:bg-surface transition-colors cursor-pointer"
          >
            <option value="">{tCommon("allEducationLevels")}</option>
            {educationLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.nameCn}
              </option>
            ))}
          </select>
          <select
            name="categoryId"
            defaultValue={categoryId || ""}
            className="px-4 py-2 bg-surface-elevated border border-base rounded-lg hover:bg-surface transition-colors cursor-pointer"
          >
            <option value="">{tCommon("allCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameCn}
              </option>
            ))}
          </select>
          <select
            name="classTypeId"
            defaultValue={classTypeId || ""}
            className="px-4 py-2 bg-surface-elevated border border-base rounded-lg hover:bg-surface transition-colors cursor-pointer"
          >
            <option value="">{tCommon("allClassTypes")}</option>
            {classTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nameCn}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t("searchPlaceholder")}
            className="flex-1 min-w-[250px] px-4 py-2 bg-surface-elevated border border-base rounded-lg focus:outline-none focus:ring-2 ring-primary"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg transition-colors"
          >
            {tCommon("search")}
          </button>
          {(search || educationLevelId || categoryId || classTypeId) && (
            <Link
              href="/courses"
              className="px-4 py-2 bg-interactive hover:bg-interactive-hover text-muted-strong rounded-lg transition-colors no-underline flex items-center"
            >
              {tCommon("clear")}
            </Link>
          )}
        </div>
      </form>

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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/courses"
          searchParams={{
            ...(search && { search }),
            ...(educationLevelId && { educationLevelId }),
            ...(categoryId && { categoryId }),
            ...(classTypeId && { classTypeId }),
          }}
        />
      )}
    </main>
  );
}
