import { ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { getViewerContext } from "@/lib/comment-utils";
import { getCommentsPayload } from "@/lib/comments-server";
import { getDescriptionPayload } from "@/lib/descriptions-server";
import { prisma as basePrisma, getPrisma } from "@/lib/prisma";

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
    select: { nameCn: true, nameEn: true, code: true },
  });

  if (!course) {
    return { title: t("pages.courses") };
  }

  const courseName =
    locale === "en-us" && course.nameEn?.trim()
      ? course.nameEn.trim()
      : course.nameCn;
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
  const parsedId = parseInt(jwId, 10);

  if (Number.isNaN(parsedId)) {
    notFound();
  }

  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const course = await prisma.course.findUnique({
    where: { jwId: parsedId },
    include: {
      educationLevel: true,
      category: true,
      classType: true,
      sections: {
        include: {
          semester: true,
          campus: true,
          teachers: true,
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

  const [t, tCourse, tCommon, tComments, commentCount] = await Promise.all([
    getTranslations("courseDetail"),
    getTranslations("course"),
    getTranslations("common"),
    getTranslations("comments"),
    basePrisma.comment.count({
      where: { courseId: course.id, status: { not: "deleted" } },
    }),
  ]);

  return (
    <main className="page-main">
      <div className="mb-6 flex items-start justify-between gap-4">
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
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-8">
          <div className="mt-2">
            <h1 className="mb-2 text-display">{course.namePrimary}</h1>
            {course.nameSecondary && (
              <p className="text-muted-foreground text-subtitle">
                {course.nameSecondary}
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
              <TabsTab value="sections">{t("tabs.sections")}</TabsTab>
              <TabsTab value="comments">
                {t("tabs.comments")} ({commentCount})
              </TabsTab>
            </TabsList>
            <TabsPanel value="comments" keepMounted>
              <div className="space-y-4">
                <Suspense fallback={<CommentsSkeleton />}>
                  <CourseCommentsLoader
                    courseId={course.id}
                    tabCourseLabel={tComments("tabCourse")}
                  />
                </Suspense>
              </div>
            </TabsPanel>
            <TabsPanel value="sections" keepMounted>
              <div className="space-y-4">
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
                            {section.stdCount ?? 0} /{" "}
                            {section.limitCount ?? "—"}
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
            </TabsPanel>
          </CommentAwareTabs>
        </div>

        <aside className="lg:-order-1 space-y-4">
          <Suspense fallback={<DescriptionSkeleton />}>
            <DescriptionLoader targetType="course" targetId={course.id} />
          </Suspense>
          <Collapsible className="space-y-4" defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground text-sm lg:hidden">
              <span>{tCourse("basicInfo")}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsiblePanel className="lg:block">
              <Card>
                <CardHeader>
                  <CardTitle>{tCourse("basicInfo")}</CardTitle>
                </CardHeader>
                <CardPanel>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground">
                        {tCourse("code")}
                      </span>
                      <span className="font-medium font-mono text-foreground">
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
                        <span className="text-muted-foreground">
                          {tCourse("type")}
                        </span>
                        <span className="font-medium text-foreground">
                          {course.classType.namePrimary}
                        </span>
                      </div>
                    )}
                  </div>
                </CardPanel>
              </Card>
            </CollapsiblePanel>
          </Collapsible>
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

async function CourseCommentsLoader({
  courseId,
  tabCourseLabel,
}: {
  courseId: number;
  tabCourseLabel: string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const commentsData = await getCommentsPayload(
    { type: "course", targetId: courseId },
    viewer,
  );

  const commentsInitialData = {
    commentMap: { course: commentsData.comments },
    hiddenMap: { course: commentsData.hiddenCount },
    hiddenCount: commentsData.hiddenCount,
    viewer: commentsData.viewer,
  };

  return (
    <CommentsSection
      targets={[
        {
          key: "course",
          label: tabCourseLabel,
          type: "course",
          targetId: courseId,
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
