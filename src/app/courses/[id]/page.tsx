import { notFound } from "next/navigation";
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
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
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
import { prisma } from "@/lib/prisma";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const searchP = await searchParams;
  const view = searchP.view || "table";
  const locale = await getLocale();
  const course = await prisma.course.findUnique({
    where: { jwId: parseInt(id, 10) },
    include: {
      educationLevel: true,
      category: true,
      classType: true,
      sections: {
        include: {
          semester: true,
          campus: true,
          teachers: {
            include: {
              department: true,
            },
          },
        },
        orderBy: {
          semester: { jwId: "desc" },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const t = await getTranslations("courseDetail");
  const tCourse = await getTranslations("course");
  const tCommon = await getTranslations("common");
  const isEnglish = locale === "en-us";

  const semesterGroupedSections = course.sections.reduce(
    (acc: [string, typeof course.sections][], section) => {
      const semesterName = section.semester?.nameCn || tCommon("unknown");
      const existing = acc.find(([name]) => name === semesterName);
      if (existing) {
        existing[1].push(section);
      } else {
        acc.push([semesterName, [section]]);
      }
      return acc;
    },
    [],
  );

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/courses">
              {tCommon("courses")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">
          {isEnglish && course.nameEn ? course.nameEn : course.nameCn}
        </h1>
        {isEnglish
          ? course.nameCn && (
              <p className="text-subtitle text-muted-foreground">
                {course.nameCn}
              </p>
            )
          : course.nameEn && (
              <p className="text-subtitle text-muted-foreground">
                {course.nameEn}
              </p>
            )}
      </div>

      {/* Basic Info Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{tCourse("basicInfo")}</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground">{tCourse("code")}</span>
              <span className="font-medium text-foreground font-mono">
                {course.code}
              </span>
            </div>
            {course.educationLevel && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">
                  {tCourse("level")}
                </span>
                <span className="font-medium text-foreground">
                  {course.educationLevel.nameCn}
                </span>
              </div>
            )}
            {course.category && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">
                  {tCourse("category")}
                </span>
                <span className="font-medium text-foreground">
                  {course.category.nameCn}
                </span>
              </div>
            )}
            {course.classType && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{tCourse("type")}</span>
                <span className="font-medium text-foreground">
                  {course.classType.nameCn}
                </span>
              </div>
            )}
          </div>
        </CardPanel>
      </Card>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-2">
            {t("availableSections", { count: course.sections.length })}
          </h2>
          <ViewSwitcher />
        </div>
        {view === "table" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("semester")}</TableHead>
                <TableHead>{t("sectionCode")}</TableHead>
                <TableHead>{t("teachers")}</TableHead>
                <TableHead>{t("campus")}</TableHead>
                <TableHead>{t("capacity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.sections.map((section) => (
                <ClickableTableRow
                  key={section.jwId}
                  href={`/sections/${section.jwId}`}
                >
                  <TableCell>
                    {section.semester ? section.semester.nameCn : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{section.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[12ch] truncate"
                      title={
                        section.teachers && section.teachers.length > 0
                          ? section.teachers
                              .map((teacher) => teacher.nameCn)
                              .join(", ")
                          : undefined
                      }
                    >
                      {section.teachers && section.teachers.length > 0
                        ? section.teachers
                            .map((teacher) => teacher.nameCn)
                            .join(", ")
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {section.campus ? section.campus.nameCn : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {section.stdCount ?? 0} / {section.limitCount ?? "—"}
                    </Badge>
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          semesterGroupedSections.map(([semesterName, semesterSections]) => (
            <div key={semesterName} className="mb-6">
              <h3 className="text-subtitle mb-3">
                {t("semesterSections", {
                  semester: semesterName,
                  count: semesterSections.length,
                })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {semesterSections.map((section) => (
                  <Link
                    key={section.jwId}
                    href={`/sections/${section.jwId}`}
                    className="no-underline"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          <Badge variant="outline">{section.code}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardPanel>
                        <div className="flex flex-col gap-3">
                          {section.teachers && section.teachers.length > 0 && (
                            <p className="text-body text-foreground">
                              <strong>{t("teachers")}:</strong>{" "}
                              <span
                                className="inline-block max-w-[20ch] truncate align-bottom"
                                title={section.teachers
                                  .map((teacher) => teacher.nameCn)
                                  .join(", ")}
                              >
                                {section.teachers
                                  .map((teacher) => teacher.nameCn)
                                  .join(", ")}
                              </span>
                            </p>
                          )}
                          {section.campus && (
                            <p className="text-body text-foreground">
                              <strong>{t("campus")}:</strong>{" "}
                              {section.campus.nameCn}
                            </p>
                          )}
                          <p className="text-body text-foreground">
                            <strong>{t("capacity")}:</strong>{" "}
                            {section.stdCount ?? 0} /{" "}
                            {section.limitCount ?? "—"}
                          </p>
                        </div>
                      </CardPanel>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
        {course.sections.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("noSections")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </main>
  );
}
