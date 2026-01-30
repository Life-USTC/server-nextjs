"use client";

import { useLocale, useTranslations } from "next-intl";
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
  section: {
    jwId: number | null;
    code: string | null;
    courseName: string | null;
    semesterName: string | null;
  } | null;
};

type HomeworkSummaryListProps = {
  homeworks: HomeworkSummary[];
};

export function HomeworkSummaryList({ homeworks }: HomeworkSummaryListProps) {
  const t = useTranslations("homeworks");
  const locale = useLocale();
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const formatDate = (value: string | null) => {
    if (!value) return t("dateTBD");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t("dateTBD");
    return formatter.format(parsed);
  };

  const renderTags = (homework: HomeworkSummary) => (
    <div className="flex flex-wrap gap-2">
      {homework.isMajor && <Badge variant="secondary">{t("tagMajor")}</Badge>}
      {homework.requiresTeam && <Badge variant="outline">{t("tagTeam")}</Badge>}
      {!homework.isMajor && !homework.requiresTeam && (
        <Badge variant="outline">{t("tagDefault")}</Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {homeworks.map((homework) => {
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
                  <p className="text-xs text-muted-foreground">
                    {t("createdAt", {
                      date: formatter.format(new Date(homework.createdAt)),
                    })}
                  </p>
                  {detailParts.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {detailParts.join(" · ")}
                    </p>
                  )}
                </div>
                <CardAction className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={href} />}
                  >
                    {t("viewDetails")}
                  </Button>
                </CardAction>
              </div>
            </CardHeader>
            <CardPanel className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("submissionDue")}
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {formatDate(homework.submissionDueAt)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
                {homework.description ? (
                  <CommentMarkdown content={homework.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("descriptionEmpty")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
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
