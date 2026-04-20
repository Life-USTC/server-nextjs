"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataState } from "@/components/data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { apiClient, extractApiErrorMessage } from "@/lib/api/client";
import {
  homeworkCompletionResponseSchema,
  homeworksListResponseSchema,
} from "@/lib/api/schemas";
import { logClientError } from "@/lib/log/app-logger";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import {
  createShanghaiDateTimeFormatter,
  parseShanghaiDateTimeLocalInput,
} from "@/lib/time/shanghai-format";
import { AuditLogSheet } from "./homework-audit-log-sheet";
import { HomeworkCardEditForm } from "./homework-card-edit-form";
import { HomeworkCreateSheet } from "./homework-create-sheet";
import { HomeworkItemCard } from "./homework-item-card";
import {
  type AuditLogEntry,
  EMPTY_VIEWER,
  type HomeworkEntry,
  type ViewerSummary,
} from "./homework-types";

type HomeworkPanelProps = {
  sectionId: number;
  semesterStart?: string | null;
  semesterEnd?: string | null;
  initialData?: {
    homeworks: HomeworkEntry[];
    auditLogs: AuditLogEntry[];
    viewer: ViewerSummary;
  };
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

// NOTE: HomeworkCardEditForm and AuditLogSheet have been extracted to
// ./homework-card-edit-form.tsx and ./homework-audit-log-sheet.tsx respectively.
// Types are shared via ./homework-types.ts.
