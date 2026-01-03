import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { addLocalizedNames, type Localized } from "@/lib/localization-helpers";
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

  const semesterGroupedSections = course.sections.reduce(
    (acc: [string, typeof course.sections][], section) => {
      const semesterName = section.semester
        ? addLocalizedNames(section.semester, locale).namePrimary
        : "Unknown";
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

  const t = await getTranslations("courseDetail");
  const tCommon = await getTranslations("common");

  const localizedCourse = addLocalizedNames(course, locale);
  const localizedEducationLevel = course.educationLevel
    ? addLocalizedNames(course.educationLevel, locale)
    : null;
  const localizedCategory = course.category
    ? addLocalizedNames(course.category, locale)
    : null;
  const localizedClassType = course.classType
    ? addLocalizedNames(course.classType, locale)
    : null;

  // Create a map of section.id -> localized semester for easy lookup in table
  const semesterNameMap = new Map(
    course.sections.map((section) => {
      if (section.semester) {
        addLocalizedNames(section.semester, locale);
        return [section.jwId, (section.semester as any).namePrimary];
      }
      return [section.jwId, "Unknown"];
    }),
  );

  // Localize sections with teachers and campus
  const localizedSections = course.sections.map((section) => {
    section.teachers.forEach((teacher) => {
      addLocalizedNames(teacher, locale);
    });
    if (section.campus) addLocalizedNames(section.campus, locale);
    return section;
  });

  const breadcrumbs = [
    { label: tCommon("home"), href: "/" },
    { label: tCommon("courses"), href: "/courses" },
    { label: course.code },
  ];

  return (
    <main className="page-main">
      <PageHeader
        title={localizedCourse.namePrimary}
        subtitle={localizedCourse.nameSecondary || undefined}
        breadcrumbs={breadcrumbs}
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Badge variant="outline">{course.code}</Badge>
        {localizedEducationLevel && (
          <Badge variant="outline">{localizedEducationLevel.namePrimary}</Badge>
        )}
        {localizedCategory && (
          <Badge variant="outline">{localizedCategory.namePrimary}</Badge>
        )}
        {localizedClassType && (
          <Badge variant="outline">{localizedClassType.namePrimary}</Badge>
        )}
      </div>

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
              {localizedSections.map((section) => (
                <ClickableTableRow
                  key={section.jwId}
                  href={`/sections/${section.jwId}`}
                >
                  <TableCell>
                    {semesterNameMap.get(section.jwId) || "—"}
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
                              .map(
                                (teacher) =>
                                  (teacher as Localized<typeof teacher>)
                                    .namePrimary,
                              )
                              .join(", ")
                          : undefined
                      }
                    >
                      {section.teachers && section.teachers.length > 0
                        ? section.teachers
                            .map(
                              (teacher) =>
                                (teacher as Localized<typeof teacher>)
                                  .namePrimary,
                            )
                            .join(", ")
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {section.campus
                      ? (section.campus as Localized<typeof section.campus>)
                          .namePrimary
                      : "—"}
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
                                  .map(
                                    (teacher) =>
                                      (teacher as Localized<typeof teacher>)
                                        .namePrimary,
                                  )
                                  .join(", ")}
                              >
                                {section.teachers
                                  .map(
                                    (teacher) =>
                                      (teacher as Localized<typeof teacher>)
                                        .namePrimary,
                                  )
                                  .join(", ")}
                              </span>
                            </p>
                          )}
                          {section.campus && (
                            <p className="text-body text-foreground">
                              <strong>{t("campus")}:</strong>{" "}
                              {
                                (
                                  section.campus as Localized<
                                    typeof section.campus
                                  >
                                ).namePrimary
                              }
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
