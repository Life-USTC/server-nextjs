"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { CommentEditor } from "@/components/comments/comment-editor";
import { CommentThread } from "@/components/comments/comment-thread";
import type {
  CommentNode,
  CommentViewer,
} from "@/components/comments/comment-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUploadsSummary } from "@/hooks/use-uploads-summary";
import { Link } from "@/i18n/routing";

type ThreadResponse = {
  thread: CommentNode[];
  focusId: string;
  hiddenCount: number;
  viewer: CommentViewer;
  target: {
    sectionId?: number | null;
    courseId?: number | null;
    teacherId?: number | null;
    sectionTeacherId?: number | null;
    sectionTeacherSectionId?: number | null;
    sectionTeacherTeacherId?: number | null;
    sectionTeacherSectionJwId?: number | null;
    sectionTeacherSectionCode?: string | null;
    sectionTeacherTeacherName?: string | null;
    sectionTeacherCourseJwId?: number | null;
    sectionTeacherCourseName?: string | null;
    homeworkId?: string | null;
    homeworkTitle?: string | null;
    homeworkSectionJwId?: number | null;
    homeworkSectionCode?: string | null;
    sectionJwId?: number | null;
    sectionCode?: string | null;
    courseJwId?: number | null;
    courseName?: string | null;
    teacherName?: string | null;
  };
};

type CommentThreadPageProps = {
  commentId: string;
};

export function CommentThreadPage({ commentId }: CommentThreadPageProps) {
  const t = useTranslations("comments");
  const [thread, setThread] = useState<CommentNode[]>([]);
  const [viewer, setViewer] = useState<CommentViewer>({
    userId: null,
    name: null,
    image: null,
    isAdmin: false,
    isAuthenticated: false,
    isSuspended: false,
    suspensionReason: null,
    suspensionExpiresAt: null,
  });
  const {
    uploads,
    summary: uploadSummary,
    addUpload,
  } = useUploadsSummary({
    enabled: viewer.isAuthenticated,
  });
  const [focusId, setFocusId] = useState(commentId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ThreadResponse["target"]>({});

  const loadThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments/${commentId}`);
      if (!response.ok) {
        throw new Error("Failed to load");
      }
      const data = (await response.json()) as ThreadResponse;
      setThread(data.thread);
      setViewer(data.viewer);
      setFocusId(data.focusId);
      setTarget(data.target ?? {});
    } catch (error) {
      console.error("Failed to load comment thread", error);
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [commentId, t]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  const createReply = async (payload: {
    body: string;
    visibility: string;
    isAnonymous: boolean;
    attachmentIds: string[];
    parentId?: string;
  }) => {
    let targetType: string = "section";
    let targetId: number | null = null;
    let sectionId: number | null = null;
    let teacherId: number | null = null;
    let homeworkId: string | null = null;

    if (target.sectionTeacherId) {
      targetType = "section-teacher";
      sectionId = target.sectionTeacherSectionId ?? null;
      teacherId = target.sectionTeacherTeacherId ?? null;
    } else if (target.homeworkId) {
      targetType = "homework";
      homeworkId = target.homeworkId ?? null;
    } else if (target.courseId) {
      targetType = "course";
      targetId = target.courseId ?? null;
    } else if (target.teacherId) {
      targetType = "teacher";
      targetId = target.teacherId ?? null;
    } else if (target.sectionId) {
      targetType = "section";
      targetId = target.sectionId ?? null;
    }

    const payloadTargetId = targetType === "homework" ? homeworkId : targetId;
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId: payloadTargetId,
        sectionId,
        teacherId,
        body: payload.body,
        visibility: payload.visibility,
        isAnonymous: payload.isAnonymous,
        parentId: payload.parentId ?? null,
        attachmentIds: payload.attachmentIds,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create reply");
    }

    await loadThread();
  };

  const handleEdit = async (
    commentIdValue: string,
    payload: {
      body: string;
      attachmentIds: string[];
      visibility?: string;
      isAnonymous?: boolean;
    },
  ) => {
    const response = await fetch(`/api/comments/${commentIdValue}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: payload.body,
        attachmentIds: payload.attachmentIds,
        visibility: payload.visibility,
        isAnonymous: payload.isAnonymous,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update comment");
    }

    await loadThread();
  };

  const handleDelete = async (commentIdValue: string) => {
    const response = await fetch(`/api/comments/${commentIdValue}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete comment");
    }

    await loadThread();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardPanel className="space-y-2">
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button variant="outline" onClick={() => void loadThread()}>
            {t("retry")}
          </Button>
        </CardPanel>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardPanel className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-base">{t("threadTitle")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("threadSubtitle")}
              </p>
            </div>
            {viewer.isAuthenticated ? (
              <Badge variant="secondary">{t("loggedInBadge")}</Badge>
            ) : (
              <Badge variant="outline">{t("guestBadge")}</Badge>
            )}
          </div>
          <CommentEditor
            viewer={viewer}
            uploads={uploads}
            uploadSummary={uploadSummary}
            onUploadComplete={addUpload}
            submitLabel={t("postReply")}
            onSubmit={(payload) => createReply(payload)}
          />
        </CardPanel>
      </Card>

      {(target.sectionJwId ||
        target.courseJwId ||
        target.teacherId ||
        target.sectionTeacherSectionJwId ||
        target.sectionTeacherCourseJwId ||
        target.homeworkId) && (
        <Card>
          <CardPanel className="flex flex-wrap gap-3">
            {target.homeworkId && target.homeworkSectionJwId && (
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    className="no-underline"
                    href={`/sections/${target.homeworkSectionJwId}#homework-${target.homeworkId}`}
                  />
                }
              >
                {target.homeworkTitle ?? t("viewHomework")}
              </Button>
            )}
            {target.sectionTeacherSectionJwId ? (
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    className="no-underline"
                    href={`/sections/${target.sectionTeacherSectionJwId}`}
                  />
                }
              >
                {target.sectionTeacherSectionCode ?? t("viewSection")}
              </Button>
            ) : (
              target.sectionJwId && (
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      className="no-underline"
                      href={`/sections/${target.sectionJwId}`}
                    />
                  }
                >
                  {target.sectionCode ?? t("viewSection")}
                </Button>
              )
            )}
            {target.sectionTeacherCourseJwId ? (
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    className="no-underline"
                    href={`/courses/${target.sectionTeacherCourseJwId}`}
                  />
                }
              >
                {target.sectionTeacherCourseName ?? t("viewCourse")}
              </Button>
            ) : (
              target.courseJwId && (
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      className="no-underline"
                      href={`/courses/${target.courseJwId}`}
                    />
                  }
                >
                  {target.courseName ?? t("viewCourse")}
                </Button>
              )
            )}
            {target.sectionTeacherTeacherId ? (
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    className="no-underline"
                    href={`/teachers/${target.sectionTeacherTeacherId}`}
                  />
                }
              >
                {target.sectionTeacherTeacherName ?? t("viewTeacher")}
              </Button>
            ) : (
              target.teacherId && (
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      className="no-underline"
                      href={`/teachers/${target.teacherId}`}
                    />
                  }
                >
                  {target.teacherName ?? t("viewTeacher")}
                </Button>
              )
            )}
          </CardPanel>
        </Card>
      )}

      <CommentThread
        comments={thread}
        viewer={viewer}
        uploads={uploads}
        uploadSummary={uploadSummary}
        onUploadComplete={addUpload}
        onReply={(parentId, payload) => createReply({ ...payload, parentId })}
        onEdit={handleEdit}
        onDelete={handleDelete}
        highlightId={focusId}
      />
    </div>
  );
}
