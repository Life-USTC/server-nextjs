import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
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
      const semesterName = section.semester?.nameCn || "Unknown";
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
  const isEnglish = locale === "en-us";

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

      <div className="mb-8 flex flex-wrap gap-2">
        <Badge variant="outline">{course.code}</Badge>
        {course.educationLevel && (
          <Badge variant="outline">{course.educationLevel.nameCn}</Badge>
        )}
        {course.category && (
          <Badge variant="outline">{course.category.nameCn}</Badge>
        )}
        {course.classType && (
          <Badge variant="outline">{course.classType.nameCn}</Badge>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-title-2 mb-4">
          {t("availableSections", { count: course.sections.length })}
        </h2>
        {semesterGroupedSections.map(([semesterName, semesterSections]) => (
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
                            {section.teachers
                              .map((teacher) => teacher.nameCn)
                              .join(", ")}
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
                          {section.stdCount ?? 0} / {section.limitCount ?? "—"}
                        </p>
                      </div>
                    </CardPanel>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
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
