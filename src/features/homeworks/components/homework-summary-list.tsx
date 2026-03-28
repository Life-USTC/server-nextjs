"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useClientTimezone } from "@/components/client-timezone-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CommentMarkdown } from "@/features/comments/components/comment-markdown";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { apiClient, extractApiErrorMessage } from "@/lib/api/client";
import { homeworkCompletionResponseSchema } from "@/lib/api/schemas";
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
};

type HomeworkFilter = "all" | "incomplete" | "completed";

export function HomeworkSummaryList({
  homeworks,
  sections,
}: HomeworkSummaryListProps) {
  const t = useTranslations("homeworks");
  const tComments = useTranslations("comments");
  const locale = useLocale();
  const clientTimeZone = useClientTimezone();
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState(homeworks);
  const [filter, setFilter] = useState<HomeworkFilter>("incomplete");
  const [completionSaving, setCompletionSaving] = useState<
    Record<string, boolean>
  >({});
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        ...(clientTimeZone ? { timeZone: clientTimeZone } : {}),
      }),
    [clientTimeZone, locale],
  );

  useEffect(() => {
    setItems(homeworks);
  }, [homeworks]);

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
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t("dateTBD");
    return formatter.format(parsed);
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
      console.error("Failed to update completion", error);
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
      <div className="flex flex-col gap-6">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border border-border/70 p-1">
              <Button
                size="sm"
                variant={filter === "incomplete" ? "secondary" : "ghost"}
                onClick={() => setFilter("incomplete")}
              >
                {t("filterIncomplete")}
              </Button>
              <Button
                size="sm"
                variant={filter === "completed" ? "secondary" : "ghost"}
                onClick={() => setFilter("completed")}
              >
                {t("filterCompleted")}
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "secondary" : "ghost"}
                onClick={() => setFilter("all")}
              >
                {t("filterAll")}
              </Button>
            </div>
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
          </div>
        </CardHeader>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle className="text-base">{t("filterEmptyTitle")}</CardTitle>
          </CardHeader>
        </div>
      ) : null}

      <div className="columns-1 [column-gap:1rem] sm:columns-2 lg:columns-3">
        {filteredItems.map((homework) => {
          const section = homework.section;
          const courseLabel = section?.courseName?.trim() || "";
          const href = section?.jwId
            ? `/sections/${section.jwId}#homework-${homework.id}`
            : "/sections";

          return (
            <Card
              key={homework.id}
              className="mb-4 flex min-h-0 break-inside-avoid flex-col border-border/60"
            >
              <CardHeader className="shrink-0 pb-2">
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
              </CardHeader>
              <CardPanel className="min-h-0 flex-1 space-y-2 pt-0 text-sm">
                {homework.description ? (
                  <div className="mb-8 line-clamp-2 rounded-lg border border-border/60 bg-muted/5 px-2 py-1.5 text-muted-foreground text-xs">
                    <CommentMarkdown content={homework.description} />
                  </div>
                ) : null}
                <p className="font-semibold text-foreground tabular-nums">
                  {formatDate(homework.submissionDueAt)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {renderTags(homework)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`homework-completed-summary-${homework.id}`}
                      checked={Boolean(homework.completion)}
                      onCheckedChange={(checked) =>
                        void handleCompletionToggle(homework.id, checked)
                      }
                      disabled={completionSaving[homework.id]}
                    />
                    <Label
                      htmlFor={`homework-completed-summary-${homework.id}`}
                      className="sr-only"
                    >
                      {homework.completion
                        ? t("completedLabel")
                        : t("filterIncomplete")}
                    </Label>
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
