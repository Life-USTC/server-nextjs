"use client";

import { CheckCircle2, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardTabToolbar,
  DashboardTabToolbarGroup,
  dashboardTabToolbarItemClass,
} from "@/components/filters/dashboard-tab-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { CommentMarkdown } from "@/features/comments/components/comment-markdown";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { apiClient, extractApiErrorMessage } from "@/lib/api/client";
import { homeworkCompletionResponseSchema } from "@/lib/api/schemas";
import { logClientError } from "@/lib/log/app-logger";
import { formatSmartDateTime } from "@/shared/lib/time-utils";
import { HomeworkCreateSheet } from "./homework-create-sheet";

type HomeworkSummary = {
  id: string;
  title: string;
  isMajor: boolean;
  requiresTeam: boolean;
  publishedAt: string | null;
  submissionStartAt: string | null;
  submissionDueAt: string | null;
  createdAt: string;
  description: string | null;
  completion: {
    completedAt: string;
  } | null;
  section: {
    jwId: number | null;
    code: string | null;
    courseName: string | null;
    semesterName: string | null;
  } | null;
};

type HomeworkSummaryListProps = {
  homeworks: HomeworkSummary[];
  sections: Array<{
    id: number;
    jwId: number | null;
    code: string | null;
    courseName: string | null;
    semesterName: string | null;
    semesterStart: string | null;
    semesterEnd: string | null;
  }>;
  referenceNow?: string | null;
};

type HomeworkFilter = "all" | "incomplete" | "completed";

export function HomeworkSummaryList({
  homeworks,
  sections,
  referenceNow,
}: HomeworkSummaryListProps) {
  const t = useTranslations("homeworks");
  const tComments = useTranslations("comments");
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState(homeworks);
  const [filter, setFilter] = useState<HomeworkFilter>("incomplete");
  const [completionSaving, setCompletionSaving] = useState<
    Record<string, boolean>
  >({});
  useEffect(() => {
    setItems(homeworks);
  }, [homeworks]);

  const referenceDate = useMemo(() => {
    if (!referenceNow) return new Date();
    const parsed = new Date(referenceNow);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [referenceNow]);

  const filteredItems = useMemo(() => {
    if (filter === "completed") {
      return items.filter((homework) => Boolean(homework.completion));
    }
    if (filter === "incomplete") {
      return items.filter((homework) => !homework.completion);
    }
    return items;
  }, [filter, items]);

  const formatDate = (value: string | null) => {
    if (!value) return t("dateTBD");
    return formatSmartDateTime(value, referenceDate, locale);
  };

  const renderTags = (homework: HomeworkSummary) => (
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
    setCompletionSaving((prev) => ({ ...prev, [homeworkId]: true }));
    try {
      const result = await apiClient.PUT("/api/homeworks/{id}/completion", {
        params: {
          path: { id: homeworkId },
        },
        body: { completed: nextCompleted },
      });

      if (!result.response.ok || !result.data) {
        const apiMessage = extractApiErrorMessage(result.error);
        logClientError(
          "Failed to update homework completion",
          apiMessage ?? result.error,
          {
            feature: "homeworks",
            homeworkId,
            nextCompleted,
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

      setItems((prev) =>
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
    } catch (error) {
      logClientError("Failed to update homework completion", error, {
        feature: "homeworks",
        homeworkId,
        nextCompleted,
      });
      toast({
        title: t("completionFailed"),
        variant: "destructive",
      });
    } finally {
      setCompletionSaving((prev) => ({ ...prev, [homeworkId]: false }));
    }
  };

  const sectionOptions = useMemo(() => {
    return sections
      .filter((section) => typeof section.jwId === "number")
      .map((section) => {
        const parts = [section.code, section.courseName, section.semesterName]
          .map((value) => (value ?? "").trim())
          .filter(Boolean);
        return {
          id: section.id,
          label: parts.join(" · ") || String(section.id),
          semesterStart: section.semesterStart,
          semesterEnd: section.semesterEnd,
        };
      });
  }, [sections]);

  return (
    <div className="space-y-4">
      <DashboardTabToolbar>
        <DashboardTabToolbarGroup>
          <Button
            size="sm"
            variant="ghost"
            className={dashboardTabToolbarItemClass(filter === "incomplete")}
            onClick={() => setFilter("incomplete")}
          >
            {t("filterIncomplete")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={dashboardTabToolbarItemClass(filter === "completed")}
            onClick={() => setFilter("completed")}
          >
            {t("filterCompleted")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={dashboardTabToolbarItemClass(filter === "all")}
            onClick={() => setFilter("all")}
          >
            {t("filterAll")}
          </Button>
        </DashboardTabToolbarGroup>
        <HomeworkCreateSheet
          canCreate={sectionOptions.length > 0}
          t={t}
          tComments={tComments}
          sectionOptions={sectionOptions}
          defaultSectionId={sectionOptions[0]?.id ?? null}
          idPrefix="dashboard-homework"
          createButtonTestId="dashboard-homework-create"
          onCreated={() => {
            router.refresh();
          }}
          triggerRender={
            <Button
              disabled={sectionOptions.length === 0}
              data-testid="dashboard-homeworks-add"
            />
          }
          triggerChildren={
            <>
              <Plus className="h-4 w-4" />
              {t("addButton")}
            </>
          }
        />
      </DashboardTabToolbar>

      {filteredItems.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("filterEmptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("filterEmptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((homework) => {
          const section = homework.section;
          const courseLabel = section?.courseName?.trim() || "";
          const href = section?.jwId
            ? `/sections/${section.jwId}#homework-${homework.id}`
            : "/sections";

          return (
            <Card
              key={homework.id}
              className="group flex h-full min-h-0 flex-col rounded-xl border-border/70 bg-card/72"
            >
              <CardPanel className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="space-y-1">
                  <CardTitle className="min-w-0 truncate font-medium text-base">
                    <Link
                      className="block truncate no-underline hover:underline"
                      href={href}
                      title={homework.title}
                    >
                      {homework.title}
                    </Link>
                  </CardTitle>
                  {courseLabel ? (
                    <CardDescription className="min-w-0 truncate">
                      {courseLabel}
                    </CardDescription>
                  ) : null}
                </div>
                {homework.description ? (
                  <div className="line-clamp-2 rounded-lg border border-border/50 bg-background/70 px-2.5 py-2 text-muted-foreground text-xs">
                    <CommentMarkdown content={homework.description} />
                  </div>
                ) : null}
                <div className="mt-auto space-y-2 text-sm">
                  <p className="font-semibold text-foreground tabular-nums">
                    {formatDate(homework.submissionDueAt)}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {renderTags(homework)}
                    </div>
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
                        disabled={completionSaving[homework.id]}
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
                  </div>
                </div>
              </CardPanel>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
