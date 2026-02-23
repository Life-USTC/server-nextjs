import { ArrowRight, BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import type { Translate } from "../types";

type HomeworkEntryCardProps = {
  t: Translate;
  dueTodayCount: number;
  dueSoonCount: number;
};

export function HomeworkEntryCard({
  t,
  dueSoonCount,
  dueTodayCount,
}: HomeworkEntryCardProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4" />
          {t("homeworks.title")}
        </CardTitle>
        <CardDescription>{t("homeworks.descriptionV2")}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">
          {t("homeworks.dueToday", { count: dueTodayCount })}
        </Badge>
        <Badge variant="outline">
          {t("homeworks.dueSoon", { count: dueSoonCount })}
        </Badge>
        <Button
          size="sm"
          className="ml-auto"
          render={
            <Link
              className="no-underline"
              href="/dashboard/homeworks"
              data-testid="dashboard-homeworks-entry"
            />
          }
        >
          {t("homeworks.openAll")}
          <ArrowRight />
        </Button>
      </CardPanel>
    </Card>
  );
}
