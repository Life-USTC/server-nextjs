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

async function getCourseData(courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      educationLevel: true,
      category: true,
      classType: true,
    },
  });

  if (!course) {
    return null;
  }

  const sections = await prisma.section.findMany({
    where: { courseId },
    include: {
      semester: true,
      campus: true,
      teachers: {
        include: {
          department: true,
        },
      },
    },
  });

  const sortedSections = sections.sort((a, b) => {
    const semesterA = a.semester?.name || "";
    const semesterB = b.semester?.name || "";
    if (semesterA !== semesterB) {
      return semesterB.localeCompare(semesterA);
    }
    return a.code.localeCompare(b.code);
  });

  return {
    course,
    sections: sortedSections,
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const data = await getCourseData(Number(id));

  if (!data) {
    notFound();
  }

  const { course, sections } = data;

  // Group sections by semester
  const semesterMap = new Map<string, typeof sections>();
  sections.forEach((section) => {
    const semesterName = section.semester?.name || "Unknown";
    if (!semesterMap.has(semesterName)) {
      semesterMap.set(semesterName, []);
    }
    semesterMap.get(semesterName)?.push(section);
  });

  const sortedSemesters = Array.from(semesterMap.entries()).sort((a, b) =>
    b[0].localeCompare(a[0]),
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
          {t("availableSections", { count: sections.length })}
        </h2>
        {sortedSemesters.map(([semesterName, semesterSections]) => (
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
                  key={section.id}
                  href={`/sections/${section.id}`}
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
        {sections.length === 0 && (
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
