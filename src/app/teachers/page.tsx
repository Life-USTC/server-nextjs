import type { Prisma } from "@prisma/client";
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
import { getPrisma } from "@/lib/prisma";
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

  return departments;
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

  const [data, departments] = await Promise.all([
    fetchTeachers(page, departmentId, search, locale),
    fetchDepartments(locale),
  ]);

  const { data: teachers, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const selectedDepartment = departments.find(
    (d) => d.id.toString() === departmentId,
  );

  const t = await getTranslations("teachers");
  const tCommon = await getTranslations("common");

  const buildUrl = (page: number) => {
    const params = new URLSearchParams({
      ...(departmentId && { departmentId }),
      ...(search && { search }),
      ...(view !== "table" && { view }),
      page: page.toString(),
    });
    return `/teachers?${params.toString()}`;
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
            <BreadcrumbPage>{tCommon("teachers")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>

      <TeachersFilter
        departments={departments}
        defaultValues={{ search, departmentId }}
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          {t("showing", { count: teachers.length, total })}
          {search && (
            <span className="ml-2">{t("searchFor", { query: search })}</span>
          )}
          {selectedDepartment && (
            <span className="ml-2">
              {t("inDepartment", {
                department: selectedDepartment.namePrimary,
              })}
            </span>
          )}
        </p>
      </div>

      {teachers.length > 0 ? (
        <div className="mb-8">
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
                      {isEnglish && teacher.nameSecondary && (
                        <span className="ml-2 text-muted-foreground">
                          ({teacher.nameSecondary})
                        </span>
                      )}
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
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noTeachersFound")}</EmptyTitle>
            {search && (
              <EmptyDescription>
                {t("searchFor", { query: search })}
              </EmptyDescription>
            )}
            {selectedDepartment && (
              <EmptyDescription>
                {t("inDepartment", {
                  department: selectedDepartment.namePrimary,
                })}
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
