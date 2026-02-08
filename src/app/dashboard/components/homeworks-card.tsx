import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import type { HomeworkWithSection, Translate } from "../types";

type HomeworksCardProps = {
  t: Translate;
  locale: string;
  incompleteHomeworks: HomeworkWithSection[];
  dueTodayCount: number;
  dueSoonCount: number;
};

export function HomeworksCard({
  t,
  locale,
  incompleteHomeworks,
  dueSoonCount,
  dueTodayCount,
}: HomeworksCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t("homeworks.titleV2")}</CardTitle>
        <CardDescription>{t("homeworks.descriptionV2")}</CardDescription>
      </CardHeader>
      <CardPanel className="space-y-2">
        <div className="flex gap-2">
          <Badge variant="warning">
            {t("homeworks.dueToday", { count: dueTodayCount })}
          </Badge>
          <Badge variant="outline">
            {t("homeworks.dueSoon", { count: dueSoonCount })}
          </Badge>
        </div>
        {incompleteHomeworks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("homeworks.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {incompleteHomeworks.slice(0, 6).map((homework) => (
              <div key={homework.id} className="rounded-md border px-3 py-2">
                <p className="truncate font-medium text-sm">{homework.title}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {(homework.section?.course?.namePrimary ?? "—") +
                    " · " +
                    (homework.submissionDueAt
                      ? new Intl.DateTimeFormat(locale, {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(homework.submissionDueAt)
                      : t("homeworks.noDue"))}
                </p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/dashboard/homeworks"
          className="inline-flex items-center gap-1 text-muted-foreground text-sm no-underline hover:text-foreground"
        >
          {t("homeworks.openAll")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardPanel>
    </Card>
  );
}
