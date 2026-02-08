import type { Dayjs } from "dayjs";
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

type DebugDateCardProps = {
  t: Translate;
  todayStart: Dayjs;
  busiestDate: Dayjs | null;
  buildDashboardHref: (nextDate: Dayjs | null) => string;
};

export function DebugDateCard({
  t,
  todayStart,
  busiestDate,
  buildDashboardHref,
}: DebugDateCardProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle>{t("devDate.title")}</CardTitle>
        <CardDescription>
          {t("devDate.description", { date: todayStart.format("YYYY-MM-DD") })}
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              className="no-underline"
              href={buildDashboardHref(todayStart.subtract(1, "day"))}
            />
          }
        >
          {t("devDate.previous")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              className="no-underline"
              href={buildDashboardHref(todayStart)}
            />
          }
        >
          {t("devDate.today")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              className="no-underline"
              href={buildDashboardHref(todayStart.add(1, "day"))}
            />
          }
        >
          {t("devDate.next")}
        </Button>
        {busiestDate ? (
          <Button
            size="sm"
            variant="outline"
            render={
              <Link
                className="no-underline"
                href={buildDashboardHref(busiestDate)}
              />
            }
          >
            {t("devDate.busiest")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            {t("devDate.busiestNoData")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          render={<Link className="no-underline" href="/dashboard" />}
        >
          {t("devDate.reset")}
        </Button>
      </CardPanel>
    </Card>
  );
}
