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
import { Link } from "@/i18n/routing";
import { getPrisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const { id } = await params;
  const parsedId = parseInt(id, 10);

  if (Number.isNaN(parsedId)) {
    return { title: t("pages.teachers") };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: parsedId },
  });

  if (!teacher) {
    return { title: t("pages.teachers") };
  }

  const teacherName = teacher.namePrimary;

  return {
    title: t("pages.teacherDetail", {
      name: teacherName,
    }),
  };
}

export default async function TeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const isEnglish = locale === "en-us";

  const parsedId = parseInt(id, 10);
  if (Number.isNaN(parsedId)) {
    notFound();
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: parsedId },
    include: {
      department: true,
      teacherTitle: true,
      sections: {
        include: {
          course: true,
          semester: true,
          campus: true,
        },
        orderBy: [
          { semester: { jwId: "desc" } },
          { course: { nameCn: "asc" } },
        ],
      },
    },
  });

  if (!teacher) {
    notFound();
  }

  const t = await getTranslations("teacherDetail");
  const tCommon = await getTranslations("common");
  const tComments = await getTranslations("comments");

  return (
    <main className="page-main">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {tCommon("home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/teachers" />}>
              {tCommon("teachers")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{teacher.namePrimary}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">
          {teacher.namePrimary}
          {isEnglish && teacher.nameSecondary && (
            <span className="ml-3 text-muted-foreground">
              ({teacher.nameSecondary})
            </span>
          )}
        </h1>
        {teacher.department && (
          <p className="text-subtitle text-muted-foreground">
            {teacher.department.namePrimary}
          </p>
        )}
      </div>

      {/* Basic Info Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardPanel>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground">{t("name")}</span>
              <span className="font-medium text-foreground">
                {teacher.namePrimary}
                {teacher.nameSecondary && (
                  <span className="ml-2 text-muted-foreground">
                    ({teacher.nameSecondary})
                  </span>
                )}
              </span>
            </div>
            {teacher.department && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("department")}</span>
                <span className="font-medium text-foreground">
                  {teacher.department.namePrimary}
                </span>
              </div>
            )}
            {teacher.teacherTitle && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("title")}</span>
                <span className="font-medium text-foreground">
                  {teacher.teacherTitle.namePrimary}
                </span>
              </div>
            )}
            {teacher.email && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("email")}</span>
                <span className="font-medium text-foreground">
                  {teacher.email}
                </span>
              </div>
            )}
            {teacher.telephone && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("telephone")}</span>
                <span className="font-medium text-foreground">
                  {teacher.telephone}
                </span>
              </div>
            )}
            {teacher.mobile && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("mobile")}</span>
                <span className="font-medium text-foreground">
                  {teacher.mobile}
                </span>
              </div>
            )}
            {teacher.address && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("address")}</span>
                <span className="font-medium text-foreground">
                  {teacher.address}
                </span>
              </div>
            )}
          </div>
        </CardPanel>
      </Card>

      {/* Teaching Sections */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-headline">
          {t("teachingSections", { count: teacher.sections.length })}
        </h2>
      </div>

      {teacher.sections.length > 0 ? (
        <div className="mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("semester")}</TableHead>
                <TableHead>{t("courseName")}</TableHead>
                <TableHead>{t("sectionCode")}</TableHead>
                <TableHead>{t("credits")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacher.sections.map((section) => (
                <ClickableTableRow
                  key={section.id}
                  href={`/sections/${section.jwId}`}
                >
                  <TableCell>
                    {section.semester && (
                      <Badge variant="outline">{section.semester.nameCn}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{section.course.namePrimary}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {section.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {section.credits !== null ? section.credits : "—"}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noSections")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}

      <div className="mt-10">
        <h2 className="text-title-2 mb-4">{tComments("title")}</h2>
        <CommentsSection
          targets={[
            {
              key: "teacher",
              label: tComments("tabTeacher"),
              type: "teacher",
              targetId: teacher.id,
            },
          ]}
        />
      </div>
    </main>
  );
}
