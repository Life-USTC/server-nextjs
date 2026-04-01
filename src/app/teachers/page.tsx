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
import { Badge } from "@/components/ui/badge";
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
import { getPrisma } from "@/lib/db/prisma";
import { getPaginationTokens } from "@/lib/navigation/pagination";
import { buildSearchParams } from "@/lib/navigation/search-params";
import { paginatedTeacherQuery } from "@/lib/query-helpers";
import { TeachersFilter } from "./teachers-filter";

async function fetchTeachers(
  page: number,
  departmentId?: string,
  search?: string,
  locale = "zh-cn",
) {
  const where: Prisma.TeacherWhereInput = {};

  if (departmentId) {
    const parsedDepartmentId = parseInt(departmentId, 10);
    if (!Number.isNaN(parsedDepartmentId)) {
      where.departmentId = parsedDepartmentId;
    }
  }

  if (search) {
    where.OR = [
      { nameCn: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  return paginatedTeacherQuery(page, where, { nameCn: "asc" }, locale);
}

async function fetchDepartments(locale: string) {
  const prisma = getPrisma(locale);
  const departments = await prisma.department.findMany({
    where: {
      teachers: {
        some: {},
      },
    },
    orderBy: { nameCn: "asc" },
  });

  return departments.map((department) => ({
    id: department.id,
    namePrimary: department.namePrimary,
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.teachers"),
  };
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    departmentId?: string;
    search?: string;
    view?: string;
  }>;
}) {
  const locale = await getLocale();
  const searchP = await searchParams;
  const page = parseInt(searchP.page || "1", 10);
  const departmentId = searchP.departmentId;
  const search = searchP.search;
  const view = searchP.view || "table";
  const isEnglish = locale === "en-us";

  const [data, departments, t, tCommon] = await Promise.all([
    fetchTeachers(page, departmentId, search, locale),
    fetchDepartments(locale),
    getTranslations("teachers"),
    getTranslations("common"),
  ]);

  const { data: teachers, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const selectedDepartment = departments.find(
    (d) => d.id.toString() === departmentId,
  );

  const buildUrl = (page: number) => {
    const query = buildSearchParams({
      values: {
        departmentId,
        search,
        view: view !== "table" ? view : "",
        page: page > 1 ? String(page) : "",
      },
    });
    return query ? `/teachers?${query}` : "/teachers";
  };

  const pageTokens = getPaginationTokens({
    currentPage,
    totalPages,
    maxVisible: 5,
  });

  return (
    <PageLayout
      title={t("title")}
      description={t("subtitle")}
      breadcrumbs={
        <PageBreadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tCommon("teachers") },
          ]}
        />
      }
    >
      <TeachersFilter
        departments={departments}
        defaultValues={{ search, departmentId }}
      />

      <PageMeta>
        {t("showing", { count: teachers.length, total })}
        {search ? (
          <span className="ml-2">{t("searchFor", { query: search })}</span>
        ) : null}
        {selectedDepartment ? (
          <span className="ml-2">
            {t("inDepartment", {
              department: selectedDepartment.namePrimary,
            })}
          </span>
        ) : null}
      </PageMeta>

      <PageSection className="overflow-hidden">
        <DataState
          empty={teachers.length === 0}
          emptyTitle={t("noTeachersFound")}
          emptyDescription={
            search
              ? t("searchFor", { query: search })
              : selectedDepartment
                ? t("inDepartment", {
                    department: selectedDepartment.namePrimary,
                  })
                : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("department")}</TableHead>
                <TableHead>{t("title_label")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("sectionCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <ClickableTableRow
                  key={teacher.id}
                  href={`/teachers/${teacher.id}`}
                >
                  <TableCell>
                    <div className="font-medium">
                      {teacher.namePrimary}
                      {isEnglish && teacher.nameSecondary ? (
                        <span className="ml-2 text-muted-foreground">
                          ({teacher.nameSecondary})
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {teacher.department ? (
                      <Badge variant="outline">
                        {teacher.department.namePrimary}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {teacher.teacherTitle
                      ? teacher.teacherTitle.namePrimary
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {teacher.email ? (
                      <span className="text-sm">{teacher.email}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{teacher._count.sections}</Badge>
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </PageSection>

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            {currentPage > 1 ? (
              <PaginationItem>
                <PaginationPrevious href={buildUrl(currentPage - 1)} />
              </PaginationItem>
            ) : null}
            {pageTokens.map((pageNum, index) => (
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
    </PageLayout>
  );
}
