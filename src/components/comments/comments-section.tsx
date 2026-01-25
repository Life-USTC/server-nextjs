"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentEditor } from "@/components/comments/comment-editor";
import { CommentThread } from "@/components/comments/comment-thread";
import type {
  CommentNode,
  CommentTarget,
  CommentViewer,
} from "@/components/comments/comment-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

type UploadOption = {
  id: string;
  filename: string;
  size: number;
  key?: string;
};

type UploadSummary = {
  maxFileSizeBytes: number;
  quotaBytes: number;
  usedBytes: number;
};

type TargetOption = {
  key: string;
  label: string;
  type: CommentTarget["type"];
  targetId?: number;
  sectionId?: number;
  teacherId?: number;
};

type TeacherOption = {
  id: number;
  label: string;
};

type CommentsSectionProps = {
  targets: TargetOption[];
  teacherOptions?: TeacherOption[];
  showAllTargets?: boolean;
};

type CommentsResponse = {
  comments: CommentNode[];
  hiddenCount: number;
  viewer: CommentViewer;
};

export function CommentsSection({
  targets,
  teacherOptions = [],
  showAllTargets = false,
}: CommentsSectionProps) {
  const t = useTranslations("comments");
  const [activeKey, setActiveKey] = useState(targets[0]?.key ?? "");
  const [postTargetKey, setPostTargetKey] = useState(targets[0]?.key ?? "");
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [commentMap, setCommentMap] = useState<Record<string, CommentNode[]>>(
    {},
  );
  const [hiddenCount, setHiddenCount] = useState(0);
  const [hiddenMap, setHiddenMap] = useState<Record<string, number>>({});
  const [viewer, setViewer] = useState<CommentViewer>({
    userId: null,
    name: null,
    image: null,
    isAdmin: false,
    isAuthenticated: false,
  });
  const [uploads, setUploads] = useState<UploadOption[]>([]);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    teacherOptions[0]?.id ?? null,
  );

  const activeTarget = useMemo(
    () =>
      showAllTargets
        ? (targets[0] ?? null)
        : (targets.find((target) => target.key === activeKey) ?? targets[0]),
    [activeKey, showAllTargets, targets],
  );

  const loadComments = useCallback(async () => {
    if (!activeTarget) return;
    setLoading(true);
    setError(null);
    if (
      !showAllTargets &&
      activeTarget.type === "section-teacher" &&
      !selectedTeacherId
    ) {
      setComments([]);
      setHiddenCount(0);
      setCommentMap({});
      setHiddenMap({});
      setLoading(false);
      return;
    }
    try {
      const fetchTargets = showAllTargets ? targets : [activeTarget];
      const responses = await Promise.all(
        fetchTargets
          .filter((target) =>
            target.type === "section-teacher"
              ? Boolean(selectedTeacherId)
              : true,
          )
          .map(async (target) => {
            const params = new URLSearchParams();
            params.set("targetType", target.type);
            if (target.targetId) {
              params.set("targetId", String(target.targetId));
            }
            if (target.sectionId) {
              params.set("sectionId", String(target.sectionId));
            }
            if (target.teacherId) {
              params.set("teacherId", String(target.teacherId));
            }
            if (target.type === "section-teacher" && selectedTeacherId) {
              params.set("sectionId", String(target.sectionId));
              params.set("teacherId", String(selectedTeacherId));
            }

            const response = await fetch(`/api/comments?${params.toString()}`);
            if (!response.ok) {
              throw new Error("Failed to load comments");
            }
            const data = (await response.json()) as CommentsResponse;
            return { key: target.key, data };
          }),
      );

      const nextMap: Record<string, CommentNode[]> = {};
      const nextHidden: Record<string, number> = {};
      let totalHidden = 0;
      for (const entry of responses) {
        nextMap[entry.key] = entry.data.comments;
        nextHidden[entry.key] = entry.data.hiddenCount;
        totalHidden += entry.data.hiddenCount;
      }

      setCommentMap(nextMap);
      setHiddenMap(nextHidden);
      if (activeTarget) {
        setComments(nextMap[activeTarget.key] ?? []);
      }
      setHiddenCount(totalHidden);
      const latestViewer = responses[0]?.data.viewer;
      if (latestViewer) {
        setViewer(latestViewer);
      }
    } catch (error) {
      console.error("Failed to load comments", error);
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [activeTarget, selectedTeacherId, showAllTargets, t, targets]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!viewer.isAuthenticated) {
      setUploads([]);
      setUploadSummary(null);
      return;
    }

    const loadUploads = async () => {
      try {
        const response = await fetch("/api/uploads");
        if (!response.ok) return;
        const data = (await response.json()) as {
          uploads: UploadOption[];
          maxFileSizeBytes: number;
          quotaBytes: number;
          usedBytes: number;
        };
        setUploads(data.uploads ?? []);
        setUploadSummary({
          maxFileSizeBytes: data.maxFileSizeBytes,
          quotaBytes: data.quotaBytes,
          usedBytes: data.usedBytes,
        });
      } catch (error) {
        console.error("Failed to load uploads", error);
      }
    };

    void loadUploads();
  }, [viewer.isAuthenticated]);

  const createComment = async (payload: {
    body: string;
    visibility: string;
    isAnonymous: boolean;
    attachmentIds: string[];
    parentId?: string;
  }) => {
    const targetForPost =
      targets.find((target) => target.key === postTargetKey) ?? activeTarget;
    if (!targetForPost) return;
    if (targetForPost.type === "section-teacher" && !selectedTeacherId) {
      throw new Error("Teacher required");
    }
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: targetForPost.type,
        targetId: targetForPost.targetId,
        sectionId: targetForPost.sectionId,
        teacherId:
          targetForPost.type === "section-teacher"
            ? selectedTeacherId
            : targetForPost.teacherId,
        body: payload.body,
        visibility: payload.visibility,
        isAnonymous: payload.isAnonymous,
        parentId: payload.parentId ?? null,
        attachmentIds: payload.attachmentIds,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create comment");
    }

    await loadComments();
  };

  const handleReply = async (
    parentId: string,
    payload: {
      body: string;
      visibility: string;
      isAnonymous: boolean;
      attachmentIds: string[];
    },
  ) => {
    await createComment({ ...payload, parentId });
  };

  const handleEdit = async (
    commentId: string,
    payload: { body: string; attachmentIds: string[] },
  ) => {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: payload.body,
        attachmentIds: payload.attachmentIds,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update comment");
    }

    await loadComments();
  };

  const handleDelete = async (commentId: string) => {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete comment");
    }

    await loadComments();
  };

  const renderThread = () => {
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
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void loadComments()}>
              {t("retry")}
            </Button>
          </CardPanel>
        </Card>
      );
    }

    if (!showAllTargets && comments.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    }

    if (!showAllTargets) {
      return (
        <CommentThread
          comments={comments}
          viewer={viewer}
          uploads={uploads}
          uploadSummary={uploadSummary}
          onUploadComplete={(upload: UploadOption, summary: UploadSummary) => {
            setUploads((current) => [upload, ...current]);
            setUploadSummary(summary);
          }}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      );
    }

    const combinedComments = targets.flatMap((target) =>
      (commentMap[target.key] ?? []).map((comment) => ({
        ...comment,
        contextLabel: target.label,
      })),
    );

    if (combinedComments.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    }

    if (activeTarget?.type === "section-teacher" && !selectedTeacherId) {
      return (
        <Card className="border-dashed bg-muted/40">
          <CardPanel>
            <p className="text-sm text-muted-foreground">
              {t("selectTeacherPrompt")}
            </p>
          </CardPanel>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        <CommentThread
          comments={combinedComments}
          viewer={viewer}
          uploads={uploads}
          uploadSummary={uploadSummary}
          onUploadComplete={(upload: UploadOption, summary: UploadSummary) => {
            setUploads((current) => [upload, ...current]);
            setUploadSummary(summary);
          }}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    );
  };

  const threadContent = showAllTargets ? null : renderThread();

  const content = (
    <div className="space-y-6">
      <Card>
        <CardPanel className="space-y-4">
          {activeTarget?.type === "section-teacher" &&
            teacherOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{t("teacherFilter")}</Badge>
                <Select
                  value={selectedTeacherId ? String(selectedTeacherId) : ""}
                  onValueChange={(value) => {
                    const parsed = value ? parseInt(value, 10) : Number.NaN;
                    setSelectedTeacherId(Number.isNaN(parsed) ? null : parsed);
                  }}
                  items={teacherOptions.map((teacher) => ({
                    label: teacher.label,
                    value: String(teacher.id),
                  }))}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder={t("selectTeacher")} />
                  </SelectTrigger>
                  <SelectPopup>
                    {teacherOptions.map((teacher) => (
                      <SelectItem key={teacher.id} value={String(teacher.id)}>
                        {teacher.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            )}

          <CommentEditor
            viewer={viewer}
            uploads={uploads}
            uploadSummary={uploadSummary}
            onUploadComplete={(
              upload: UploadOption,
              summary: UploadSummary,
            ) => {
              setUploads((current) => [upload, ...current]);
              setUploadSummary(summary);
            }}
            submitLabel={t("postAction")}
            onSubmit={(payload) => createComment(payload)}
            visibilityStyle="checkboxes"
            targetOptions={
              targets.length > 1
                ? targets.map((target) => ({
                    value: target.key,
                    label: target.label,
                  }))
                : undefined
            }
            targetValue={postTargetKey}
            onTargetChange={(value) => setPostTargetKey(value)}
          />
        </CardPanel>
      </Card>

      {threadContent}

      {hiddenCount > 0 && !viewer.isAuthenticated && (
        <Card className="border-dashed bg-muted/40">
          <CardPanel className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("hiddenNotice", { count: hiddenCount })}
            </p>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/signin" />}
            >
              {t("loginToView")}
            </Button>
          </CardPanel>
        </Card>
      )}
    </div>
  );

  if (targets.length <= 1) {
    return content;
  }

  return (
    <div className="space-y-4">
      {content}
      {showAllTargets && renderThread()}
    </div>
  );
}
