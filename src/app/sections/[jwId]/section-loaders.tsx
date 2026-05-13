import { Suspense } from "react";
import { CommentsSkeleton, HomeworkSkeleton } from "@/components/skeletons";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { getCommentsPayload } from "@/features/comments/server/comments-server";
import { HomeworkPanel } from "@/features/homeworks/components/homework-panel";
import { getViewerContext } from "@/lib/auth/viewer-context";
import { prisma as basePrisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";

// --- CommentsLoader (streamed via Suspense) ---

async function CommentsLoaderInner({
  sectionId,
  courseId,
  teacherOptions,
  tabSectionLabel,
  tabCourseLabel,
  tabSectionTeacherLabel,
}: {
  sectionId: number;
  courseId: number;
  teacherOptions: { id: number; label: string }[];
  tabSectionLabel: string;
  tabCourseLabel: string;
  tabSectionTeacherLabel: string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const selectedTeacherId = teacherOptions[0]?.id ?? null;

  const [sectionComments, courseComments, sectionTeacherComments] =
    await Promise.all([
      getCommentsPayload({ type: "section", targetId: sectionId }, viewer),
      getCommentsPayload({ type: "course", targetId: courseId }, viewer),
      selectedTeacherId
        ? getCommentsPayload(
            {
              type: "section-teacher",
              sectionId,
              teacherId: selectedTeacherId,
            },
            viewer,
          )
        : Promise.resolve({ comments: [], hiddenCount: 0, viewer }),
    ]);

  const commentsInitialData = {
    commentMap: {
      section: sectionComments.comments,
      course: courseComments.comments,
      "section-teacher": sectionTeacherComments.comments,
    },
    hiddenMap: {
      section: sectionComments.hiddenCount,
      course: courseComments.hiddenCount,
      "section-teacher": sectionTeacherComments.hiddenCount,
    },
    hiddenCount:
      sectionComments.hiddenCount +
      courseComments.hiddenCount +
      sectionTeacherComments.hiddenCount,
    viewer: sectionComments.viewer,
  };

  return (
    <CommentsSection
      targets={[
        {
          key: "section",
          label: tabSectionLabel,
          type: "section",
          targetId: sectionId,
        },
        {
          key: "course",
          label: tabCourseLabel,
          type: "course",
          targetId: courseId,
        },
        {
          key: "section-teacher",
          label: tabSectionTeacherLabel,
          type: "section-teacher",
          sectionId,
        },
      ]}
      teacherOptions={teacherOptions}
      showAllTargets
      initialData={commentsInitialData}
    />
  );
}

export function SectionCommentsLoader(props: {
  sectionId: number;
  courseId: number;
  teacherOptions: { id: number; label: string }[];
  tabSectionLabel: string;
  tabCourseLabel: string;
  tabSectionTeacherLabel: string;
}) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsLoaderInner {...props} />
      </Suspense>
    </div>
  );
}

// --- HomeworkLoader (streamed via Suspense) ---

async function HomeworkLoaderInner({
  sectionId,
  semesterStart,
  semesterEnd,
}: {
  sectionId: number;
  semesterStart: string | null;
  semesterEnd: string | null;
}) {
  const homeworkViewer = await getViewerContext({ includeAdmin: true });

  const homeworkInclude = {
    description: true,
    createdBy: {
      select: { id: true, name: true, username: true, image: true },
    },
    updatedBy: {
      select: { id: true, name: true, username: true, image: true },
    },
    deletedBy: {
      select: { id: true, name: true, username: true, image: true },
    },
    ...(homeworkViewer.userId
      ? {
          homeworkCompletions: {
            where: { userId: homeworkViewer.userId },
            select: { completedAt: true },
          },
        }
      : {}),
  } as const;

  const [homeworkEntries, homeworkAuditLogs] = await Promise.all([
    basePrisma.homework.findMany({
      where: { sectionId, deletedAt: null },
      include: homeworkInclude,
      orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
    }),
    basePrisma.homeworkAuditLog.findMany({
      where: { sectionId },
      include: {
        actor: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const homeworkCommentCountRows =
    homeworkEntries.length > 0
      ? await basePrisma.comment.groupBy({
          by: ["homeworkId"],
          where: {
            homeworkId: { in: homeworkEntries.map((homework) => homework.id) },
            status: { not: "deleted" },
          },
          _count: { _all: true },
        })
      : [];
  const homeworkCommentCounts = new Map(
    homeworkCommentCountRows.flatMap((row) =>
      row.homeworkId ? [[row.homeworkId, row._count._all] as const] : [],
    ),
  );

  type HomeworkRowWithCompletions = (typeof homeworkEntries)[number] & {
    homeworkCompletions?: Array<{ completedAt: Date }>;
  };

  const homeworks = homeworkEntries.map(
    (homework: HomeworkRowWithCompletions) => {
      const { homeworkCompletions, ...rest } = homework;
      return {
        ...rest,
        completion: homeworkCompletions?.[0] ?? null,
        commentCount: homeworkCommentCounts.get(homework.id) ?? 0,
      };
    },
  );

  const homeworkInitialData = {
    homeworks: homeworks.map((homework) => ({
      ...homework,
      createdAt: toShanghaiIsoString(homework.createdAt),
      updatedAt: toShanghaiIsoString(homework.updatedAt),
      deletedAt: homework.deletedAt
        ? toShanghaiIsoString(homework.deletedAt)
        : null,
      publishedAt: homework.publishedAt
        ? toShanghaiIsoString(homework.publishedAt)
        : null,
      submissionStartAt: homework.submissionStartAt
        ? toShanghaiIsoString(homework.submissionStartAt)
        : null,
      submissionDueAt: homework.submissionDueAt
        ? toShanghaiIsoString(homework.submissionDueAt)
        : null,
      description: homework.description
        ? {
            id: homework.description.id,
            content: homework.description.content ?? "",
            updatedAt: homework.description.updatedAt
              ? toShanghaiIsoString(homework.description.updatedAt)
              : null,
          }
        : null,
      completion: homework.completion
        ? { completedAt: toShanghaiIsoString(homework.completion.completedAt) }
        : null,
    })),
    auditLogs: homeworkAuditLogs.map((log) => ({
      ...log,
      createdAt: toShanghaiIsoString(log.createdAt),
    })),
    viewer: homeworkViewer,
  };

  return (
    <HomeworkPanel
      sectionId={sectionId}
      semesterStart={semesterStart}
      semesterEnd={semesterEnd}
      initialData={homeworkInitialData}
    />
  );
}

export function SectionHomeworkLoader(props: {
  sectionId: number;
  semesterStart: string | null;
  semesterEnd: string | null;
}) {
  return (
    <Suspense fallback={<HomeworkSkeleton />}>
      <HomeworkLoaderInner {...props} />
    </Suspense>
  );
}
