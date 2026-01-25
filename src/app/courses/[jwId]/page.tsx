import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { CommentsSection } from "@/components/comments/comments-section";
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
import { getPrisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jwId: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const { jwId } = await params;
  const parsedId = parseInt(jwId, 10);

  if (Number.isNaN(parsedId)) {
    return { title: t("pages.courses") };
  }

  const course = await prisma.course.findUnique({
    where: { jwId: parsedId },
  });

  if (!course) {
    return { title: t("pages.courses") };
  }

  const courseName = course.namePrimary;
  const displayName = courseName || course.code;

  return {
    title: t("pages.courseDetail", {
      name: displayName,
    }),
  };
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ jwId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { jwId } = await params;
  const searchP = await searchParams;
  const _view = searchP.view || "table";
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const course = await prisma.course.findUnique({
    where: { jwId: parseInt(jwId, 10) },
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
  const tComments = await getTranslations("comments");

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
        <h1 className="text-display mb-2">{course.namePrimary}</h1>
        {course.nameSecondary && (
          <p className="text-subtitle text-muted-foreground">
            {course.nameSecondary}
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
                  {course.educationLevel.namePrimary}
                </span>
              </div>
            )}
            {course.category && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">
                  {tCourse("category")}
                </span>
                <span className="font-medium text-foreground">
                  {course.category.namePrimary}
                </span>
              </div>
            )}
            {course.classType && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{tCourse("type")}</span>
                <span className="font-medium text-foreground">
                  {course.classType.namePrimary}
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
        </div>
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
                            .map((teacher) => teacher.namePrimary)
                            .join(", ")
                        : undefined
                    }
                  >
                    {section.teachers && section.teachers.length > 0
                      ? section.teachers
                          .map((teacher) => teacher.namePrimary)
                          .join(", ")
                      : "—"}
                  </div>
                </TableCell>
                <TableCell>
                  {section.campus ? section.campus.namePrimary : "—"}
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

        {course.sections.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("noSections")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-title-2 mb-4">{tComments("title")}</h2>
        <CommentsSection
          targets={[
            {
              key: "course",
              label: tComments("tabCourse"),
              type: "course",
              targetId: course.id,
            },
          ]}
        />
      </div>
    </main>
  );
}
