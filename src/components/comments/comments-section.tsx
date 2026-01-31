"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentEditor } from "@/components/comments/comment-editor";
import { CommentThread } from "@/components/comments/comment-thread";
import type {
  CommentNode,
  CommentTarget,
  CommentViewer,
} from "@/components/comments/comment-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
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
  homeworkId?: string;
};

type TeacherOption = {
  id: number;
  label: string;
};

type CommentsSectionProps = {
  targets: TargetOption[];
  teacherOptions?: TeacherOption[];
  showAllTargets?: boolean;
  initialData?: {
    commentMap: Record<string, CommentNode[]>;
    hiddenMap: Record<string, number>;
    hiddenCount: number;
    viewer: CommentViewer;
  };
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
  initialData,
}: CommentsSectionProps) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const [activeKey] = useState(targets[0]?.key ?? "");
  const [postTargetKey, setPostTargetKey] = useState(targets[0]?.key ?? "");
  const [comments, setComments] = useState<CommentNode[]>(
    initialData?.commentMap[targets[0]?.key ?? ""] ?? [],
  );
  const [commentMap, setCommentMap] = useState<Record<string, CommentNode[]>>(
    initialData?.commentMap ?? {},
  );
  const [hiddenCount, setHiddenCount] = useState(initialData?.hiddenCount ?? 0);
  const [, setHiddenMap] = useState<Record<string, number>>(
    initialData?.hiddenMap ?? {},
  );
  const [viewer, setViewer] = useState<CommentViewer>(
    initialData?.viewer ?? {
      userId: null,
      name: null,
      image: null,
      isAdmin: false,
      isAuthenticated: false,
      isSuspended: false,
      suspensionReason: null,
      suspensionExpiresAt: null,
    },
  );
  const [uploads, setUploads] = useState<UploadOption[]>([]);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, _setSelectedTeacherId] = useState<number | null>(
    // By design: only the first teacher matters for section-teacher comments.
    teacherOptions[0]?.id ?? null,
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
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
            if (target.type === "homework" && target.homeworkId) {
              params.set("targetId", target.homeworkId);
            } else if (target.targetId) {
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
    if (initialData) return;
    void loadComments();
  }, [initialData, loadComments]);

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
        targetId:
          targetForPost.type === "homework"
            ? targetForPost.homeworkId
            : targetForPost.targetId,
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
    payload: {
      body: string;
      attachmentIds: string[];
      visibility?: string;
      isAnonymous?: boolean;
    },
  ) => {
    const response = await fetch(`/api/comments/${commentId}`, {
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

    const { comment } = await response.json();
    if (comment) {
      const updateNodes = (nodes: CommentNode[]): CommentNode[] => {
        return nodes.map((node) => {
          if (node.id === commentId) {
            return { ...comment, replies: node.replies };
          }
          if (node.replies && node.replies.length > 0) {
            return { ...node, replies: updateNodes(node.replies) };
          }
          return node;
        });
      };

      setComments((prev) => updateNodes(prev));
    }
  };

  const handleReact = async (
    commentId: string,
    type: string,
    remove: boolean,
  ) => {
    const method = remove ? "DELETE" : "POST";
    const response = await fetch(`/api/comments/${commentId}/reactions`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });

    if (!response.ok) {
      throw new Error("Failed to update reaction");
    }

    const { success } = await response.json();
    if (success) {
      const updateNodes = (nodes: CommentNode[]): CommentNode[] =>
        nodes.map((node) => {
          if (node.id === commentId) {
            const existing = node.reactions.find((r) => r.type === type);
            const nextReactions = [...node.reactions];
            if (remove) {
              if (existing && existing.count > 1) {
                const idx = nextReactions.indexOf(existing);
                nextReactions[idx] = {
                  ...existing,
                  count: existing.count - 1,
                  viewerHasReacted: false,
                };
              } else {
                return {
                  ...node,
                  reactions: nextReactions.filter((r) => r.type !== type),
                };
              }
            } else {
              if (existing) {
                const idx = nextReactions.indexOf(existing);
                nextReactions[idx] = {
                  ...existing,
                  count: existing.count + 1,
                  viewerHasReacted: true,
                };
              } else {
                nextReactions.push({ type, count: 1, viewerHasReacted: true });
              }
            }
            return { ...node, reactions: nextReactions };
          }
          if (node.replies && node.replies.length > 0) {
            return { ...node, replies: updateNodes(node.replies) };
          }
          return node;
        });

      setComments((prev) => updateNodes(prev));
    }
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
          onReact={handleReact}
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
          onReact={handleReact}
        />
      </div>
    );
  };

  const threadContent = showAllTargets ? null : renderThread();

  const content = (
    <div className="space-y-6">
      {viewer.isSuspended && (
        <Alert variant="error">
          <AlertTitle>{t("suspendedTitle")}</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>{t("suspendedMessage")}</p>
            {viewer.suspensionReason && (
              <p className="text-sm">
                {t("suspendedReason", { reason: viewer.suspensionReason })}
              </p>
            )}
            {viewer.suspensionExpiresAt ? (
              <p className="text-sm">
                {t("suspendedExpires", {
                  date: dateFormatter.format(
                    new Date(viewer.suspensionExpiresAt),
                  ),
                })}
              </p>
            ) : (
              <p className="text-sm font-semibold">{t("suspendedPermanent")}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardPanel className="space-y-4">
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
              render={<Link className="no-underline" href="/signin" />}
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
