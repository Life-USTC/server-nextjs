"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import type { CommentNode } from "@/components/comments/comment-types";
import { CommentsSection } from "@/components/comments/comments-section";
import { MarkdownEditor } from "@/components/comments/markdown-editor";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { apiClient, extractApiErrorMessage } from "@/lib/api-client";
import {
  commentsListResponseSchema,
  descriptionsResponseSchema,
  homeworkCompletionResponseSchema,
  homeworksListResponseSchema,
} from "@/lib/api-schemas";
import { cn } from "@/lib/utils";

type ViewerSummary = {
  userId: string | null;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspensionExpiresAt: string | null;
};

type UserSummary = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type HomeworkEntry = {
  id: string;
  title: string;
  isMajor: boolean;
  requiresTeam: boolean;
  publishedAt: string | null;
  submissionStartAt: string | null;
  submissionDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdById: string | null;
  completion: {
    completedAt: string;
  } | null;
  description: {
    id: string;
    content: string;
    updatedAt: string | null;
  } | null;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  deletedBy: UserSummary | null;
};

type AuditLogEntry = {
  id: string;
  action: "created" | "deleted";
  titleSnapshot: string;
  createdAt: string;
  actor: UserSummary | null;
};

type HomeworkResponse = {
  homeworks: HomeworkEntry[];
  auditLogs: AuditLogEntry[];
  viewer: ViewerSummary;
};

type DescriptionHistoryEntry = {
  id: string;
  createdAt: string;
  previousContent: string | null;
  nextContent: string;
  editor: UserSummary | null;
};

type HomeworkPanelProps = {
  sectionId: number;
  semesterStart?: string | null;
  semesterEnd?: string | null;
  initialData?: HomeworkResponse;
};

type CreateHomeworkFormData = {
  title: string;
  description: string;
  publishedAt: string;
  submissionStartAt: string;
  submissionDueAt: string;
  isMajor: boolean;
  requiresTeam: boolean;
};

type CreateHomeworkSheetProps = {
  canCreate: boolean;
  semesterStartDate: Date | null;
  semesterEndDate: Date | null;
  onSubmit: (data: CreateHomeworkFormData) => Promise<boolean>;
  t: ReturnType<typeof useTranslations>;
  tComments: ReturnType<typeof useTranslations>;
};

type AuditLogSheetProps = {
  auditLogs: AuditLogEntry[];
  formatter: Intl.DateTimeFormat;
  labels: {
    title: string;
    empty: string;
    created: string;
    deleted: string;
    meta: (params: { name: string; date: string }) => string;
    trigger: string;
  };
};

type HomeworkCardHeaderProps = {
  homework: HomeworkEntry;
  formatter: Intl.DateTimeFormat;
  commentCount: number;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  t: ReturnType<typeof useTranslations>;
};

type HomeworkCardReadOnlyProps = {
  homework: HomeworkEntry;
  formatter: Intl.DateTimeFormat;
  tagBadges: React.ReactNode;
  isAuthenticated: boolean;
  isSavingCompletion: boolean;
  onToggleCompletion: (nextCompleted: boolean) => void;
  t: ReturnType<typeof useTranslations>;
};

type HomeworkCardEditFormProps = {
  homework: HomeworkEntry;
  formatter: Intl.DateTimeFormat;
  canDelete: boolean;
  semesterStartDate: Date | null;
  semesterEndDate: Date | null;
  onUpdate: (
    homeworkId: string,
    data: {
      title: string;
      description: string;
      publishedAt: string;
      submissionStartAt: string;
      submissionDueAt: string;
      isMajor: boolean;
      requiresTeam: boolean;
    },
    currentDescription: string,
  ) => Promise<boolean>;
  onDelete: (homeworkId: string) => Promise<boolean>;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
  tComments: ReturnType<typeof useTranslations>;
  tDescriptions: ReturnType<typeof useTranslations>;
};

const EMPTY_VIEWER: ViewerSummary = {
  userId: null,
  name: null,
  image: null,
  isAdmin: false,
  isAuthenticated: false,
  isSuspended: false,
  suspensionReason: null,
  suspensionExpiresAt: null,
};

function toLocalInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 0, 0);
  return copy;
}

export function HomeworkPanel({
  sectionId,
  semesterStart,
  semesterEnd,
  initialData,
}: HomeworkPanelProps) {
  const t = useTranslations("homeworks");
  const tComments = useTranslations("comments");
  const tDescriptions = useTranslations("descriptions");
  const locale = useLocale();
  const { toast } = useToast();
  const [homeworks, setHomeworks] = useState<HomeworkEntry[]>(
    initialData?.homeworks ?? [],
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(
    initialData?.auditLogs ?? [],
  );
  const [viewer, setViewer] = useState<ViewerSummary>(
    initialData?.viewer ?? EMPTY_VIEWER,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [completionSaving, setCompletionSaving] = useState<
    Record<string, boolean>
  >({});

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const semesterEndDate = useMemo(
    () => (semesterEnd ? new Date(semesterEnd) : null),
    [semesterEnd],
  );
  const semesterStartDate = useMemo(
    () => (semesterStart ? new Date(semesterStart) : null),
    [semesterStart],
  );

  const canCreate = viewer.isAuthenticated && !viewer.isSuspended;
  const canEdit = viewer.isAuthenticated && !viewer.isSuspended;
  const resolveHomeworkError = useCallback(
    (error: string | null) => {
      if (!error) return t("errorGeneric");
      switch (error) {
        case "Title required":
          return t("errorTitleRequired");
        case "Title too long":
          return t("errorTitleTooLong");
        case "Description too long":
          return t("errorDescriptionTooLong");
        case "Invalid publish date":
          return t("errorInvalidPublishDate");
        case "Invalid submission start":
          return t("errorInvalidSubmissionStart");
        case "Invalid submission due":
          return t("errorInvalidSubmissionDue");
        case "Submission start must be before due":
          return t("errorSubmissionRange");
        case "Unauthorized":
          return t("errorUnauthorized");
        case "Suspended":
          return t("errorSuspended");
        case "Section not found":
          return t("errorSectionNotFound");
        case "Not found":
          return t("errorNotFound");
        case "Homework deleted":
          return t("errorHomeworkDeleted");
        case "No changes":
          return t("errorNoChanges");
        default:
          return t("errorGeneric");
      }
    },
    [t],
  );

  const resolveApiErrorMessage = useCallback(
    (errorBody: unknown) => {
      const errorMessage = extractApiErrorMessage(errorBody);
      return resolveHomeworkError(errorMessage);
    },
    [resolveHomeworkError],
  );

  const countCommentNodes = useCallback((nodes: CommentNode[]): number => {
    return nodes.reduce(
      (total, node) => total + 1 + countCommentNodes(node.replies ?? []),
      0,
    );
  }, []);

  const loadCommentCounts = useCallback(
    async (entries: HomeworkEntry[]) => {
      if (!entries.length) {
        setCommentCounts({});
        return;
      }
      try {
        const responses = await Promise.all(
          entries.map(async (homework) => {
            const result = await apiClient.GET("/api/comments", {
              params: {
                query: {
                  targetType: "homework",
                  targetId: homework.id,
                },
              },
            });

            if (!result.response.ok || !result.data) {
              const apiMessage = extractApiErrorMessage(result.error);
              throw new Error(apiMessage ?? "Failed to load comments");
            }

            const parsed = commentsListResponseSchema.safeParse(result.data);
            if (!parsed.success) {
              throw new Error("Failed to load comments");
            }

            return [
              homework.id,
              countCommentNodes(parsed.data.comments ?? []),
            ] as const;
          }),
        );
        setCommentCounts(Object.fromEntries(responses));
      } catch (err) {
        console.error("Failed to load comment counts", err);
      }
    },
    [countCommentNodes],
  );

  const loadHomeworks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.GET("/api/homeworks", {
        params: {
          query: { sectionId: String(sectionId) },
        },
      });

      if (!result.response.ok || !result.data) {
        const apiMessage = extractApiErrorMessage(result.error);
        throw new Error(apiMessage ?? "Failed to load homeworks");
      }

      const parsed = homeworksListResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        throw new Error("Failed to load homeworks");
      }

      setHomeworks(parsed.data.homeworks ?? []);
      setAuditLogs(parsed.data.auditLogs ?? []);
      setViewer(parsed.data.viewer ?? EMPTY_VIEWER);
      void loadCommentCounts(parsed.data.homeworks ?? []);
    } catch (err) {
      console.error("Failed to load homeworks", err);
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [loadCommentCounts, sectionId, t]);

  useEffect(() => {
    if (initialData) {
      if (initialData.homeworks?.length) {
        void loadCommentCounts(initialData.homeworks);
      }
      return;
    }
    void loadHomeworks();
  }, [initialData, loadCommentCounts, loadHomeworks]);

  const renderTagBadges = (homework: HomeworkEntry) => (
    <div className="flex flex-wrap gap-2">
      {homework.completion && (
        <Badge variant="success">{t("completedLabel")}</Badge>
      )}
      {homework.isMajor && <Badge variant="secondary">{t("tagMajor")}</Badge>}
      {homework.requiresTeam && <Badge variant="outline">{t("tagTeam")}</Badge>}
      {!homework.isMajor && !homework.requiresTeam && (
        <Badge variant="outline">{t("tagDefault")}</Badge>
      )}
    </div>
  );

  const handleCompletionToggle = async (
    homeworkId: string,
    nextCompleted: boolean,
  ) => {
    if (!viewer.isAuthenticated) return;
    setCompletionSaving((prev) => ({ ...prev, [homeworkId]: true }));
    try {
      const result = await apiClient.PUT("/api/homeworks/{id}/completion", {
        params: {
          path: { id: homeworkId },
        },
        body: {
          completed: nextCompleted,
        },
      });

      if (!result.response.ok || !result.data) {
        const apiMessage = extractApiErrorMessage(result.error);
        console.error(
          "Failed to update completion",
          apiMessage ?? result.error,
        );
        toast({
          title: t("completionFailed"),
          variant: "destructive",
        });
        return;
      }

      const parsed = homeworkCompletionResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        toast({
          title: t("completionFailed"),
          variant: "destructive",
        });
        return;
      }

      setHomeworks((prev) =>
        prev.map((homework) =>
          homework.id === homeworkId
            ? {
                ...homework,
                completion:
                  parsed.data.completed && parsed.data.completedAt
                    ? { completedAt: parsed.data.completedAt }
                    : null,
              }
            : homework,
        ),
      );
    } catch (err) {
      console.error("Failed to update completion", err);
      toast({
        title: t("completionFailed"),
        variant: "destructive",
      });
    } finally {
      setCompletionSaving((prev) => ({ ...prev, [homeworkId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canCreate ? (
          <CreateHomeworkSheet
            canCreate={canCreate}
            semesterStartDate={semesterStartDate}
            semesterEndDate={semesterEndDate}
            onSubmit={async (data) => {
              try {
                const result = await apiClient.POST("/api/homeworks", {
                  body: {
                    sectionId: String(sectionId),
                    title: data.title.trim(),
                    description: data.description.trim(),
                    publishedAt: data.publishedAt || null,
                    submissionStartAt: data.submissionStartAt || null,
                    submissionDueAt: data.submissionDueAt || null,
                    isMajor: data.isMajor,
                    requiresTeam: data.requiresTeam,
                  },
                });

                if (!result.response.ok) {
                  const message = resolveApiErrorMessage(result.error);
                  toast({
                    title: t("createFailed"),
                    description: message,
                    variant: "destructive",
                  });
                  return false;
                }

                toast({
                  title: t("createSuccess"),
                  variant: "success",
                });
                await loadHomeworks();
                return true;
              } catch (err) {
                console.error("Failed to create homework", err);
                toast({
                  title: t("createFailed"),
                  variant: "destructive",
                });
                return false;
              }
            }}
            t={t}
            tComments={tComments}
          />
        ) : (
          <Button
            size="sm"
            variant="outline"
            render={<Link className="no-underline" href="/signin" />}
          >
            {t("loginToCreate")}
          </Button>
        )}
        <AuditLogSheet
          auditLogs={auditLogs}
          formatter={formatter}
          labels={{
            title: t("auditTitle"),
            empty: t("auditEmpty"),
            created: t("auditCreated"),
            deleted: t("auditDeleted"),
            meta: ({ name, date }: { name: string; date: string }) =>
              t("auditMeta", { name, date }),
            trigger: t("auditTitle"),
          }}
        />
      </div>

      {viewer.isSuspended && (
        <Card className="border-dashed bg-muted/40">
          <CardPanel className="space-y-2">
            <p className="text-muted-foreground text-sm">{t("suspended")}</p>
            {viewer.suspensionReason && (
              <p className="text-muted-foreground text-xs">
                {t("suspendedReason", { reason: viewer.suspensionReason })}
              </p>
            )}
          </CardPanel>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <Card className="border-dashed">
          <CardPanel className="space-y-2">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={() => void loadHomeworks()}>
              {t("retry")}
            </Button>
          </CardPanel>
        </Card>
      ) : homeworks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {homeworks.map((homework) => {
            const isEditing = editingId === homework.id;
            const canDelete =
              viewer.isAuthenticated &&
              !viewer.isSuspended &&
              (viewer.isAdmin || homework.createdById === viewer.userId);
            return (
              <Card key={homework.id} className="group border-border/60">
                <CardHeader className="gap-3">
                  <HomeworkCardHeader
                    homework={homework}
                    formatter={formatter}
                    commentCount={commentCounts[homework.id] ?? 0}
                    canEdit={canEdit}
                    isEditing={isEditing}
                    onEdit={() => setEditingId(homework.id)}
                    t={t}
                  />
                </CardHeader>
                <CardPanel className="space-y-4">
                  {!isEditing && (
                    <HomeworkCardReadOnly
                      homework={homework}
                      formatter={formatter}
                      tagBadges={renderTagBadges(homework)}
                      isAuthenticated={viewer.isAuthenticated}
                      isSavingCompletion={Boolean(
                        completionSaving[homework.id],
                      )}
                      onToggleCompletion={(checked: boolean) =>
                        void handleCompletionToggle(homework.id, checked)
                      }
                      t={t}
                    />
                  )}

                  {isEditing && (
                    <HomeworkCardEditForm
                      homework={homework}
                      formatter={formatter}
                      canDelete={canDelete}
                      semesterStartDate={semesterStartDate}
                      semesterEndDate={semesterEndDate}
                      onUpdate={async (
                        homeworkId,
                        data,
                        currentDescription,
                      ) => {
                        if (!data.title.trim()) {
                          toast({
                            title: t("titleRequired"),
                            variant: "destructive",
                          });
                          return false;
                        }

                        try {
                          const updateResult = await apiClient.PATCH(
                            "/api/homeworks/{id}",
                            {
                              params: {
                                path: { id: homeworkId },
                              },
                              body: {
                                title: data.title.trim(),
                                publishedAt: data.publishedAt || null,
                                submissionStartAt:
                                  data.submissionStartAt || null,
                                submissionDueAt: data.submissionDueAt || null,
                                isMajor: data.isMajor,
                                requiresTeam: data.requiresTeam,
                              },
                            },
                          );

                          if (!updateResult.response.ok) {
                            const message = resolveApiErrorMessage(
                              updateResult.error,
                            );
                            toast({
                              title: t("updateFailed"),
                              description: message,
                              variant: "destructive",
                            });
                            return false;
                          }

                          const nextDescription = data.description.trim();
                          if (nextDescription !== currentDescription) {
                            const descriptionResult = await apiClient.POST(
                              "/api/descriptions",
                              {
                                body: {
                                  targetType: "homework",
                                  targetId: homeworkId,
                                  content: nextDescription,
                                },
                              },
                            );

                            if (!descriptionResult.response.ok) {
                              const message = resolveApiErrorMessage(
                                descriptionResult.error,
                              );
                              toast({
                                title: t("updateFailed"),
                                description: message,
                                variant: "destructive",
                              });
                              return false;
                            }
                          }

                          toast({
                            title: t("updateSuccess"),
                            variant: "success",
                          });
                          setEditingId(null);
                          await loadHomeworks();
                          return true;
                        } catch (err) {
                          console.error("Failed to update homework", err);
                          toast({
                            title: t("updateFailed"),
                            variant: "destructive",
                          });
                          return false;
                        }
                      }}
                      onDelete={async (homeworkId) => {
                        try {
                          const deleteResult = await apiClient.DELETE(
                            "/api/homeworks/{id}",
                            {
                              params: {
                                path: { id: homeworkId },
                              },
                            },
                          );

                          if (!deleteResult.response.ok) {
                            const message = resolveApiErrorMessage(
                              deleteResult.error,
                            );
                            toast({
                              title: t("deleteFailed"),
                              description: message,
                              variant: "destructive",
                            });
                            return false;
                          }

                          toast({
                            title: t("deleteSuccess"),
                            variant: "success",
                          });
                          setEditingId(null);
                          await loadHomeworks();
                          return true;
                        } catch (err) {
                          console.error("Failed to delete homework", err);
                          toast({
                            title: t("deleteFailed"),
                            variant: "destructive",
                          });
                          return false;
                        }
                      }}
                      onCancel={() => setEditingId(null)}
                      t={t}
                      tComments={tComments}
                      tDescriptions={tDescriptions}
                    />
                  )}
                </CardPanel>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateHomeworkSheet({
  canCreate,
  semesterStartDate,
  semesterEndDate,
  onSubmit,
  t,
  tComments,
}: CreateHomeworkSheetProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [submissionStartAt, setSubmissionStartAt] = useState("");
  const [submissionDueAt, setSubmissionDueAt] = useState("");
  const [isMajor, setIsMajor] = useState(false);
  const [requiresTeam, setRequiresTeam] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPublishedAt(toLocalInputValue(today.toISOString()));
    setSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
    setSubmissionDueAt("");
    setIsMajor(false);
    setRequiresTeam(false);
  };

  useEffect(() => {
    if (!open) return;
    if (!publishedAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setPublishedAt(toLocalInputValue(today.toISOString()));
    }
    if (!submissionStartAt) {
      setSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
    }
  }, [open, publishedAt, submissionStartAt]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    const success = await onSubmit({
      title,
      description,
      publishedAt,
      submissionStartAt,
      submissionDueAt,
      isMajor,
      requiresTeam,
    });
    setIsSaving(false);
    if (success) {
      resetForm();
      setOpen(false);
    }
  };

  const applyStartNow = (setter: (value: string) => void) => {
    setter(toLocalInputValue(new Date().toISOString()));
  };

  const applyDueInAWeek = (setter: (value: string) => void) => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    setter(toLocalInputValue(endOfDay(now).toISOString()));
  };

  const applySemesterEnd = (setter: (value: string) => void) => {
    if (!semesterEndDate || Number.isNaN(semesterEndDate.getTime())) return;
    setter(toLocalInputValue(endOfDay(semesterEndDate).toISOString()));
  };

  const applySemesterStart = (setter: (value: string) => void) => {
    if (!semesterStartDate || Number.isNaN(semesterStartDate.getTime())) return;
    setter(toLocalInputValue(semesterStartDate.toISOString()));
  };

  const renderHelperActions = (target: "start" | "due") => {
    const setValue =
      target === "start" ? setSubmissionStartAt : setSubmissionDueAt;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyStartNow(setValue)}
        >
          {t("helperNow")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyDueInAWeek(setValue)}
        >
          {t("helperWeek")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applySemesterEnd(setValue)}
          disabled={!semesterEndDate}
        >
          {t("helperSemesterEnd")}
        </Button>
        {target === "start" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applySemesterStart(setValue)}
            disabled={!semesterStartDate}
          >
            {t("helperSemesterStart")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        {t("showCreate")}
      </SheetTrigger>
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>{t("createTitle")}</SheetTitle>
        </SheetHeader>
        <SheetPanel className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="homework-title">{t("titleLabel")}</Label>
            <Input
              id="homework-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("descriptionLabel")}</Label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder={t("descriptionPlaceholder")}
              tabWriteLabel={tComments("tabWrite")}
              tabPreviewLabel={tComments("tabPreview")}
              previewEmptyLabel={tComments("previewEmpty")}
              markdownGuideLabel={tComments("markdownGuide")}
              markdownGuideHref="/comments/guide"
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="homework-major"
                checked={isMajor}
                onCheckedChange={setIsMajor}
              />
              <Label htmlFor="homework-major">{t("tagMajor")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="homework-team"
                checked={requiresTeam}
                onCheckedChange={setRequiresTeam}
              />
              <Label htmlFor="homework-team">{t("tagTeam")}</Label>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="homework-published">{t("publishedAt")}</Label>
              <Input
                id="homework-published"
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPublishedAt(toLocalInputValue(new Date().toISOString()))
                  }
                >
                  {t("helperPublishNow")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPublishedAt("")}
                >
                  {t("helperClear")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework-start">{t("submissionStart")}</Label>
              <Input
                id="homework-start"
                type="datetime-local"
                value={submissionStartAt}
                onChange={(event) => setSubmissionStartAt(event.target.value)}
              />
              {renderHelperActions("start")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework-due">{t("submissionDue")}</Label>
              <Input
                id="homework-due"
                type="datetime-local"
                value={submissionDueAt}
                onChange={(event) => setSubmissionDueAt(event.target.value)}
              />
              {renderHelperActions("due")}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={isSaving || !canCreate}
            >
              {isSaving ? t("saving") : t("createAction")}
            </Button>
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}

function HomeworkCardHeader({
  homework,
  formatter,
  commentCount,
  canEdit,
  isEditing,
  onEdit,
  t,
}: HomeworkCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <CardTitle className="text-base">{homework.title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {t("createdAt", {
            date: formatter.format(new Date(homework.createdAt)),
          })}
        </p>
      </div>
      <CardAction className="flex flex-wrap gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Sheet>
          <SheetTrigger render={<Button size="sm" variant="outline" />}>
            {t("commentsAction")} ({commentCount})
          </SheetTrigger>
          <SheetPopup side="right">
            <SheetHeader>
              <SheetTitle>{t("commentsTitle")}</SheetTitle>
            </SheetHeader>
            <SheetPanel>
              <CommentsSection
                targets={[
                  {
                    key: "homework",
                    label: t("commentsLabel"),
                    type: "homework",
                    homeworkId: homework.id,
                  },
                ]}
              />
            </SheetPanel>
          </SheetPopup>
        </Sheet>
        {canEdit && !isEditing && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            {t("editAction")}
          </Button>
        )}
      </CardAction>
    </div>
  );
}

function HomeworkCardReadOnly({
  homework,
  formatter,
  tagBadges,
  isAuthenticated,
  isSavingCompletion,
  onToggleCompletion,
  t,
}: HomeworkCardReadOnlyProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{t("submissionDue")}</p>
          <p className="font-semibold text-foreground text-xl">
            {homework.submissionDueAt
              ? formatter.format(new Date(homework.submissionDueAt))
              : t("dateTBD")}
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
        {homework.description?.content ? (
          <CommentMarkdown content={homework.description.content} />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("descriptionEmpty")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
        <div className="space-y-1 text-muted-foreground text-xs">
          <p>
            {t("submissionStart")} ·{" "}
            {homework.submissionStartAt
              ? formatter.format(new Date(homework.submissionStartAt))
              : t("dateTBD")}
          </p>
          <p>
            {t("publishedAt")} ·{" "}
            {homework.publishedAt
              ? formatter.format(new Date(homework.publishedAt))
              : t("dateTBD")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tagBadges}
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Switch
                id={`homework-completed-${homework.id}`}
                checked={Boolean(homework.completion)}
                onCheckedChange={onToggleCompletion}
                disabled={isSavingCompletion}
              />
              <Label htmlFor={`homework-completed-${homework.id}`}>
                {t("completedLabel")}
              </Label>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function HomeworkCardEditForm({
  homework,
  formatter,
  canDelete,
  semesterStartDate,
  semesterEndDate,
  onUpdate,
  onDelete,
  onCancel,
  t,
  tComments,
  tDescriptions,
}: HomeworkCardEditFormProps) {
  const [editTitle, setEditTitle] = useState(homework.title);
  const [editDescription, setEditDescription] = useState(
    homework.description?.content ?? "",
  );
  const [editPublishedAt, setEditPublishedAt] = useState(
    toLocalInputValue(homework.publishedAt),
  );
  const [editSubmissionStartAt, setEditSubmissionStartAt] = useState(
    toLocalInputValue(homework.submissionStartAt),
  );
  const [editSubmissionDueAt, setEditSubmissionDueAt] = useState(
    toLocalInputValue(homework.submissionDueAt),
  );
  const [editIsMajor, setEditIsMajor] = useState(homework.isMajor);
  const [editRequiresTeam, setEditRequiresTeam] = useState(
    homework.requiresTeam,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionHistory, setDescriptionHistory] = useState<{
    entries: DescriptionHistoryEntry[];
    loading: boolean;
    error: string | null;
  }>({ entries: [], loading: false, error: null });

  const currentDescription = homework.description?.content ?? "";

  const loadDescriptionHistory = async () => {
    setDescriptionHistory((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiClient.GET("/api/descriptions", {
        params: {
          query: {
            targetType: "homework",
            targetId: homework.id,
          },
        },
      });

      if (!result.response.ok || !result.data) {
        const apiMessage = extractApiErrorMessage(result.error);
        throw new Error(apiMessage ?? "Failed to load history");
      }

      const parsed = descriptionsResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        throw new Error("Failed to load history");
      }

      setDescriptionHistory({
        entries: parsed.data.history ?? [],
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to load description history", err);
      setDescriptionHistory((prev) => ({
        ...prev,
        loading: false,
        error: tDescriptions("historyError"),
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(
      homework.id,
      {
        title: editTitle,
        description: editDescription,
        publishedAt: editPublishedAt,
        submissionStartAt: editSubmissionStartAt,
        submissionDueAt: editSubmissionDueAt,
        isMajor: editIsMajor,
        requiresTeam: editRequiresTeam,
      },
      currentDescription,
    );
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsSaving(true);
    await onDelete(homework.id);
    setIsSaving(false);
  };

  const applyStartNow = (setter: (value: string) => void) => {
    setter(toLocalInputValue(new Date().toISOString()));
  };

  const applyDueInAWeek = (setter: (value: string) => void) => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    setter(toLocalInputValue(endOfDay(now).toISOString()));
  };

  const applySemesterEnd = (setter: (value: string) => void) => {
    if (!semesterEndDate || Number.isNaN(semesterEndDate.getTime())) return;
    setter(toLocalInputValue(endOfDay(semesterEndDate).toISOString()));
  };

  const applySemesterStart = (setter: (value: string) => void) => {
    if (!semesterStartDate || Number.isNaN(semesterStartDate.getTime())) return;
    setter(toLocalInputValue(semesterStartDate.toISOString()));
  };

  const renderHelperActions = (target: "start" | "due") => {
    const setValue =
      target === "start" ? setEditSubmissionStartAt : setEditSubmissionDueAt;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyStartNow(setValue)}
        >
          {t("helperNow")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyDueInAWeek(setValue)}
        >
          {t("helperWeek")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applySemesterEnd(setValue)}
          disabled={!semesterEndDate}
        >
          {t("helperSemesterEnd")}
        </Button>
        {target === "start" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applySemesterStart(setValue)}
            disabled={!semesterStartDate}
          >
            {t("helperSemesterStart")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`homework-edit-title-${homework.id}`}>
          {t("titleLabel")}
        </Label>
        <Input
          id={`homework-edit-title-${homework.id}`}
          value={editTitle}
          onChange={(event) => setEditTitle(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("descriptionLabel")}</Label>
        <MarkdownEditor
          value={editDescription}
          onChange={setEditDescription}
          placeholder={t("descriptionPlaceholder")}
          tabWriteLabel={tComments("tabWrite")}
          tabPreviewLabel={tComments("tabPreview")}
          previewEmptyLabel={tComments("previewEmpty")}
          markdownGuideLabel={tComments("markdownGuide")}
          markdownGuideHref="/comments/guide"
        />
      </div>

      <Separator />

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id={`homework-edit-major-${homework.id}`}
            checked={editIsMajor}
            onCheckedChange={setEditIsMajor}
          />
          <Label htmlFor={`homework-edit-major-${homework.id}`}>
            {t("tagMajor")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`homework-edit-team-${homework.id}`}
            checked={editRequiresTeam}
            onCheckedChange={setEditRequiresTeam}
          />
          <Label htmlFor={`homework-edit-team-${homework.id}`}>
            {t("tagTeam")}
          </Label>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`homework-edit-publish-${homework.id}`}>
            {t("publishedAt")}
          </Label>
          <Input
            id={`homework-edit-publish-${homework.id}`}
            type="datetime-local"
            value={editPublishedAt}
            onChange={(event) => setEditPublishedAt(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setEditPublishedAt(toLocalInputValue(new Date().toISOString()))
              }
            >
              {t("helperPublishNow")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditPublishedAt("")}
            >
              {t("helperClear")}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`homework-edit-start-${homework.id}`}>
            {t("submissionStart")}
          </Label>
          <Input
            id={`homework-edit-start-${homework.id}`}
            type="datetime-local"
            value={editSubmissionStartAt}
            onChange={(event) => setEditSubmissionStartAt(event.target.value)}
          />
          {renderHelperActions("start")}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`homework-edit-due-${homework.id}`}>
            {t("submissionDue")}
          </Label>
          <Input
            id={`homework-edit-due-${homework.id}`}
            type="datetime-local"
            value={editSubmissionDueAt}
            onChange={(event) => setEditSubmissionDueAt(event.target.value)}
          />
          {renderHelperActions("due")}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Sheet
            onOpenChange={(open) => {
              if (open) {
                void loadDescriptionHistory();
              }
            }}
          >
            <SheetTrigger render={<Button size="sm" variant="outline" />}>
              {t("contentHistoryAction")}
            </SheetTrigger>
            <SheetPopup side="right">
              <SheetHeader>
                <SheetTitle>
                  {tDescriptions("historyTitle", {
                    count: descriptionHistory.entries?.length ?? 0,
                  })}
                </SheetTitle>
              </SheetHeader>
              <SheetPanel className="space-y-4">
                {descriptionHistory.loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : descriptionHistory.error ? (
                  <p className="text-muted-foreground text-sm">
                    {descriptionHistory.error}
                  </p>
                ) : descriptionHistory.entries?.length ? (
                  descriptionHistory.entries.map(
                    (entry: DescriptionHistoryEntry) => {
                      const editorName =
                        entry.editor?.name ||
                        entry.editor?.username ||
                        tDescriptions("editorUnknown");
                      return (
                        <div
                          key={entry.id}
                          className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                            <span>{editorName}</span>
                            <span>
                              {formatter.format(new Date(entry.createdAt))}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground text-xs">
                              {tDescriptions("previousLabel")}
                            </p>
                            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                              {entry.previousContent ? (
                                <CommentMarkdown
                                  content={entry.previousContent}
                                />
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  {tDescriptions("emptyValue")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground text-xs">
                              {tDescriptions("updatedLabel")}
                            </p>
                            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                              {entry.nextContent ? (
                                <CommentMarkdown content={entry.nextContent} />
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  {tDescriptions("emptyValue")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {tDescriptions("historyEmpty")}
                  </p>
                )}
              </SheetPanel>
            </SheetPopup>
          </Sheet>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
                {t("deleteAction")}
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteDescription", {
                      title: homework.title,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="ghost" />}>
                    {t("cancel")}
                  </AlertDialogClose>
                  <Button
                    variant="destructive"
                    onClick={() => void handleDelete()}
                    disabled={isSaving}
                  >
                    {t("confirmDelete")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialog>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AuditLogSheet({ auditLogs, formatter, labels }: AuditLogSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        {labels.trigger}
      </SheetTrigger>
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>
        <SheetPanel>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const actorName =
                  log.actor?.name || log.actor?.username || labels.trigger;
                const actionLabel =
                  log.action === "deleted" ? labels.deleted : labels.created;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2",
                      "border border-border/60 bg-muted/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant={
                          log.action === "deleted" ? "destructive" : "secondary"
                        }
                      >
                        {actionLabel}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {log.titleSnapshot}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {labels.meta({
                        name: actorName,
                        date: formatter.format(new Date(log.createdAt)),
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
