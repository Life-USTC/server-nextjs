import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { CommentAwareTabs } from "@/components/comments/comment-aware-tabs";
import { CommentsSection } from "@/components/comments/comments-section";
import { DescriptionPanel } from "@/components/descriptions/description-panel";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Link } from "@/i18n/routing";
import { getViewerContext } from "@/lib/comment-utils";
import { getCommentsPayload } from "@/lib/comments-server";
import { getDescriptionPayload } from "@/lib/descriptions-server";
import { prisma as basePrisma, getPrisma } from "@/lib/prisma";

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
    select: { nameCn: true, nameEn: true },
  });

  if (!teacher) {
    return { title: t("pages.teachers") };
  }

  const teacherName =
    locale === "en-us" && teacher.nameEn?.trim()
      ? teacher.nameEn.trim()
      : teacher.nameCn;

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

  const [t, tCommon, tComments, commentCount] = await Promise.all([
    getTranslations("teacherDetail"),
    getTranslations("common"),
    getTranslations("comments"),
    basePrisma.comment.count({
      where: { teacherId: teacher.id, status: { not: "deleted" } },
    }),
  ]);

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

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-8">
          <div className="mt-2">
            <h1 className="mb-2 text-display">
              {teacher.namePrimary}
              {isEnglish && teacher.nameSecondary && (
                <span className="ml-3 text-muted-foreground">
                  ({teacher.nameSecondary})
                </span>
              )}
            </h1>
            {teacher.department && (
              <p className="text-muted-foreground text-subtitle">
                {teacher.department.namePrimary}
              </p>
            )}
          </div>

          <CommentAwareTabs
            defaultValue="sections"
            commentValue="comments"
            tabValues={["sections", "comments"]}
            className="space-y-6"
          >
            <TabsList className="w-full" variant="underline">
              <TabsTab value="sections">
                {t("teachingSections", { count: teacher.sections.length })}
              </TabsTab>
              <TabsTab value="comments">
                {tComments("title")} ({commentCount})
              </TabsTab>
            </TabsList>
            <TabsPanel value="sections" keepMounted>
              {teacher.sections.length > 0 ? (
                <div>
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
                              <Badge variant="outline">
                                {section.semester.nameCn}
                              </Badge>
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
            </TabsPanel>
            <TabsPanel value="comments" keepMounted>
              <div className="space-y-4">
                <Suspense fallback={<CommentsSkeleton />}>
                  <TeacherCommentsLoader
                    teacherId={teacher.id}
                    tabTeacherLabel={tComments("tabTeacher")}
                  />
                </Suspense>
              </div>
            </TabsPanel>
          </CommentAwareTabs>
        </div>

        <aside className="lg:-order-1 space-y-4">
          <Suspense fallback={<DescriptionSkeleton />}>
            <DescriptionLoader targetType="teacher" targetId={teacher.id} />
          </Suspense>
          <Card>
            <CardHeader>
              <CardTitle>{t("basicInfo")}</CardTitle>
            </CardHeader>
            <CardPanel>
              <div className="grid grid-cols-1 gap-4 text-sm">
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
                    <span className="text-muted-foreground">
                      {t("department")}
                    </span>
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
                    <span className="text-muted-foreground">
                      {t("telephone")}
                    </span>
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
                    <span className="text-muted-foreground">
                      {t("address")}
                    </span>
                    <span className="font-medium text-foreground">
                      {teacher.address}
                    </span>
                  </div>
                )}
              </div>
            </CardPanel>
          </Card>
        </aside>
      </div>
    </main>
  );
}

// --- Suspense Skeleton Fallbacks ---

function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function DescriptionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
      </CardHeader>
      <CardPanel>
        <Skeleton className="h-20 w-full" />
      </CardPanel>
    </Card>
  );
}

// --- Async Server Component Loaders (streamed via Suspense) ---

async function TeacherCommentsLoader({
  teacherId,
  tabTeacherLabel,
}: {
  teacherId: number;
  tabTeacherLabel: string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const commentsData = await getCommentsPayload(
    { type: "teacher", targetId: teacherId },
    viewer,
  );

  const commentsInitialData = {
    commentMap: { teacher: commentsData.comments },
    hiddenMap: { teacher: commentsData.hiddenCount },
    hiddenCount: commentsData.hiddenCount,
    viewer: commentsData.viewer,
  };

  return (
    <CommentsSection
      targets={[
        {
          key: "teacher",
          label: tabTeacherLabel,
          type: "teacher",
          targetId: teacherId,
        },
      ]}
      initialData={commentsInitialData}
    />
  );
}

async function DescriptionLoader({
  targetType,
  targetId,
}: {
  targetType: "section" | "course" | "teacher" | "homework";
  targetId: number | string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const descriptionData = await getDescriptionPayload(
    targetType,
    targetId,
    viewer,
  );

  return (
    <DescriptionPanel
      targetType={targetType}
      targetId={targetId}
      initialData={descriptionData}
    />
  );
}
