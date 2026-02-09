"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

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
  addHomeworkHref: string;
};

type HomeworkFilter = "all" | "incomplete" | "completed";

export function HomeworkSummaryList({
  homeworks,
  addHomeworkHref,
}: HomeworkSummaryListProps) {
  const t = useTranslations("homeworks");
  const locale = useLocale();
  const { toast } = useToast();
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
      }),
    [locale],
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
      const response = await fetch(`/api/homeworks/${homeworkId}/completion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      if (!response.ok) {
        toast({
          title: t("completionFailed"),
          variant: "destructive",
        });
        return;
      }

      const data = (await response.json()) as {
        completed: boolean;
        completedAt: string | null;
      };

      setItems((prev) =>
        prev.map((homework) =>
          homework.id === homeworkId
            ? {
                ...homework,
                completion:
                  data.completed && data.completedAt
                    ? { completedAt: data.completedAt }
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

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
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
            <Button
              render={<Link className="no-underline" href={addHomeworkHref} />}
            >
              <Plus className="h-4 w-4" />
              {t("addButton")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {filteredItems.length === 0 ? (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">{t("filterEmptyTitle")}</CardTitle>
          </CardHeader>
        </Card>
      ) : null}

      {filteredItems.map((homework) => {
        const section = homework.section;
        const detailParts = [
          section?.courseName ?? "",
          section?.code ?? "",
          section?.semesterName ?? "",
        ].filter(Boolean);
        const href = section?.jwId
          ? `/sections/${section.jwId}#homework-${homework.id}`
          : "/sections";

        return (
          <Card key={homework.id} className="border-border/60">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{homework.title}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {t("createdAt", {
                      date: formatter.format(new Date(homework.createdAt)),
                    })}
                  </p>
                  {detailParts.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {detailParts.join(" · ")}
                    </p>
                  )}
                </div>
                <CardAction className="flex flex-wrap items-center gap-3">
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
                      className="text-muted-foreground text-xs"
                    >
                      {t("completedLabel")}
                    </Label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link className="no-underline" href={href} />}
                  >
                    {t("viewDetails")}
                  </Button>
                </CardAction>
              </div>
            </CardHeader>
            <CardPanel className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    {t("submissionDue")}
                  </p>
                  <p className="font-semibold text-foreground text-xl">
                    {formatDate(homework.submissionDueAt)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
                {homework.description ? (
                  <CommentMarkdown content={homework.description} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("descriptionEmpty")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                <div className="space-y-1">
                  <p>
                    {t("submissionStart")} ·{" "}
                    {formatDate(homework.submissionStartAt)}
                  </p>
                  <p>
                    {t("publishedAt")} · {formatDate(homework.publishedAt)}
                  </p>
                </div>
                {renderTags(homework)}
              </div>
            </CardPanel>
          </Card>
        );
      })}
    </div>
  );
}
