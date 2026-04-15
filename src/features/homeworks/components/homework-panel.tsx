"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataState } from "@/components/data-state";
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
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
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
import { CommentMarkdown } from "@/features/comments/components/comment-markdown";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { MarkdownEditor } from "@/features/comments/components/markdown-editor";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { apiClient, extractApiErrorMessage } from "@/lib/api/client";
import {
  descriptionsResponseSchema,
  homeworkCompletionResponseSchema,
  homeworksListResponseSchema,
} from "@/lib/api/schemas";
import { logClientError } from "@/lib/log/app-logger";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import {
  addShanghaiTime,
  createShanghaiDateTimeFormatter,
  endOfShanghaiDay,
  parseShanghaiDateTimeLocalInput,
  startOfShanghaiDay,
  toShanghaiDateTimeLocalValue,
} from "@/lib/time/shanghai-format";
import { cn } from "@/lib/utils";
import { HomeworkCreateSheet } from "./homework-create-sheet";
import { HomeworkItemCard } from "./homework-item-card";

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
  commentCount: number;
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

type AuditLogSheetProps = {
  auditLogs: AuditLogEntry[];
  formatTimestamp: (value: string | Date) => string;
  labels: {
    title: string;
    empty: string;
    created: string;
    deleted: string;
    meta: (params: { name: string; date: string }) => string;
    trigger: string;
  };
};

type HomeworkCardEditFormProps = {
  homework: HomeworkEntry;
  formatTimestamp: (value: string | Date) => string;
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

export function HomeworkPanel({
  sectionId,
  semesterStart,
  semesterEnd,
  initialData,
}: HomeworkPanelProps) {
  const locale = useLocale();
  const t = useTranslations("homeworks");
  const tComments = useTranslations("comments");
  const tDescriptions = useTranslations("descriptions");
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
  const [completionSaving, setCompletionSaving] = useState<
    Record<string, boolean>
  >({});
  const dateTimeFormatter = useMemo(
    () =>
      createShanghaiDateTimeFormatter(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const formatTimestamp = useCallback(
    (value: string | Date) => dateTimeFormatter.format(new Date(value)),
    [dateTimeFormatter],
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
    } catch (err) {
      logClientError("Failed to load homeworks", err, {
        component: "HomeworkPanel",
        sectionId,
      });
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [sectionId, t]);

  useEffect(() => {
    if (initialData) return;
    void loadHomeworks();
  }, [initialData, loadHomeworks]);

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
        logClientError(
          "Failed to update completion",
          apiMessage ?? result.error,
          {
            component: "HomeworkPanel",
            sectionId,
            homeworkId,
          },
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
      logClientError("Failed to update completion", err, {
        component: "HomeworkPanel",
        sectionId,
        homeworkId,
      });
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
          <HomeworkCreateSheet
            canCreate={canCreate}
            t={t}
            tComments={tComments}
            fixedSectionId={sectionId}
            fixedSemesterEnd={semesterEnd}
            idPrefix="section-homework"
            onCreated={loadHomeworks}
            triggerRender={<Button size="sm" variant="outline" />}
            triggerChildren={t("showCreate")}
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
          formatTimestamp={formatTimestamp}
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

      <DataState
        loading={loading}
        error={error}
        onRetry={() => void loadHomeworks()}
        retryLabel={t("retry")}
        empty={homeworks.length === 0}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        loadingFallback={
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        }
      >
        <div className="space-y-4">
          {homeworks.map((homework) => {
            const isEditing = editingId === homework.id;
            const canDelete =
              viewer.isAuthenticated &&
              !viewer.isSuspended &&
              (viewer.isAdmin || homework.createdById === viewer.userId);
            const createdAtLabel = t("createdAt", {
              date: formatTimestamp(homework.createdAt),
            });

            if (!isEditing) {
              return (
                <HomeworkItemCard
                  key={homework.id}
                  cardId={`homework-${homework.id}`}
                  cardClassName="group"
                  title={homework.title}
                  createdAtLabel={createdAtLabel}
                  headerActions={
                    <div className="flex flex-wrap gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <Sheet>
                        <SheetTrigger
                          render={<Button size="sm" variant="outline" />}
                        >
                          {t("commentsAction")} ({homework.commentCount})
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
                      {canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(homework.id)}
                        >
                          {t("editAction")}
                        </Button>
                      ) : null}
                    </div>
                  }
                  submissionDueLabel={t("submissionDue")}
                  submissionDueValue={
                    homework.submissionDueAt
                      ? formatTimestamp(homework.submissionDueAt)
                      : t("dateTBD")
                  }
                  description={homework.description?.content ?? null}
                  descriptionEmptyLabel={t("descriptionEmpty")}
                  startAtLabel={t("submissionStart")}
                  startAtValue={
                    homework.submissionStartAt
                      ? formatTimestamp(homework.submissionStartAt)
                      : t("dateTBD")
                  }
                  publishedAtLabel={t("publishedAt")}
                  publishedAtValue={
                    homework.publishedAt
                      ? formatTimestamp(homework.publishedAt)
                      : t("dateTBD")
                  }
                  footerStart={renderTagBadges(homework)}
                  footerEnd={
                    viewer.isAuthenticated ? (
                      <div className="min-h-7">
                        <Button
                          size="xs"
                          variant="outline"
                          className="pointer-events-none pointer-coarse:pointer-events-auto opacity-0 pointer-coarse:opacity-100 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                          onClick={() =>
                            void handleCompletionToggle(
                              homework.id,
                              !homework.completion,
                            )
                          }
                          disabled={Boolean(completionSaving[homework.id])}
                          aria-label={
                            homework.completion
                              ? t("markIncomplete")
                              : t("markComplete")
                          }
                        >
                          {homework.completion ? (
                            <RotateCcw className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {homework.completion
                            ? t("markIncomplete")
                            : t("markComplete")}
                        </Button>
                      </div>
                    ) : null
                  }
                />
              );
            }

            return (
              <Card key={homework.id} className="border-border/60">
                <CardHeader className="gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {homework.title}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                      {createdAtLabel}
                    </p>
                  </div>
                </CardHeader>
                <CardPanel className="space-y-4">
                  <HomeworkCardEditForm
                    homework={homework}
                    formatTimestamp={formatTimestamp}
                    canDelete={canDelete}
                    semesterStartDate={semesterStartDate}
                    semesterEndDate={semesterEndDate}
                    onUpdate={async (homeworkId, data, currentDescription) => {
                      if (!data.title.trim()) {
                        toast({
                          title: t("titleRequired"),
                          variant: "destructive",
                        });
                        return false;
                      }

                      try {
                        const publishedAtDate = parseShanghaiDateTimeLocalInput(
                          data.publishedAt,
                        );
                        const submissionStartAtDate =
                          parseShanghaiDateTimeLocalInput(
                            data.submissionStartAt,
                          );
                        const submissionDueAtDate =
                          parseShanghaiDateTimeLocalInput(data.submissionDueAt);
                        if (
                          publishedAtDate === undefined ||
                          submissionStartAtDate === undefined ||
                          submissionDueAtDate === undefined
                        ) {
                          toast({
                            title: t("updateFailed"),
                            description: t("errorInvalidSubmissionDue"),
                            variant: "destructive",
                          });
                          return false;
                        }

                        const updateResult = await apiClient.PATCH(
                          "/api/homeworks/{id}",
                          {
                            params: {
                              path: { id: homeworkId },
                            },
                            body: {
                              title: data.title.trim(),
                              publishedAt: publishedAtDate
                                ? toShanghaiIsoString(publishedAtDate)
                                : null,
                              submissionStartAt: submissionStartAtDate
                                ? toShanghaiIsoString(submissionStartAtDate)
                                : null,
                              submissionDueAt: submissionDueAtDate
                                ? toShanghaiIsoString(submissionDueAtDate)
                                : null,
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
                        logClientError("Failed to update homework", err, {
                          component: "HomeworkPanel",
                          sectionId,
                          homeworkId: homework.id,
                        });
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
                        logClientError("Failed to delete homework", err, {
                          component: "HomeworkPanel",
                          sectionId,
                          homeworkId: homework.id,
                        });
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
                </CardPanel>
              </Card>
            );
          })}
        </div>
      </DataState>
    </div>
  );
}

function HomeworkCardEditForm({
  homework,
  formatTimestamp,
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
    toShanghaiDateTimeLocalValue(homework.publishedAt),
  );
  const [editSubmissionStartAt, setEditSubmissionStartAt] = useState(
    toShanghaiDateTimeLocalValue(homework.submissionStartAt),
  );
  const [editSubmissionDueAt, setEditSubmissionDueAt] = useState(
    toShanghaiDateTimeLocalValue(homework.submissionDueAt),
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
      logClientError("Failed to load description history", err, {
        component: "HomeworkCardEditForm",
        homeworkId: homework.id,
      });
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
    setter(toShanghaiDateTimeLocalValue(new Date()));
  };

  const applyDueInAWeek = (setter: (value: string) => void) => {
    setter(
      toShanghaiDateTimeLocalValue(
        endOfShanghaiDay(addShanghaiTime(new Date(), 7, "day")),
      ),
    );
  };

  const applySemesterEnd = (setter: (value: string) => void) => {
    if (!semesterEndDate || Number.isNaN(semesterEndDate.getTime())) return;
    setter(toShanghaiDateTimeLocalValue(endOfShanghaiDay(semesterEndDate)));
  };

  const applySemesterStart = (setter: (value: string) => void) => {
    if (!semesterStartDate || Number.isNaN(semesterStartDate.getTime())) return;
    setter(toShanghaiDateTimeLocalValue(startOfShanghaiDay(semesterStartDate)));
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
          markdownGuideHref="/guides/markdown-support"
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
                setEditPublishedAt(toShanghaiDateTimeLocalValue(new Date()))
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
                            <span>{formatTimestamp(entry.createdAt)}</span>
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

function AuditLogSheet({
  auditLogs,
  formatTimestamp,
  labels,
}: AuditLogSheetProps) {
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
                        date: formatTimestamp(log.createdAt),
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
