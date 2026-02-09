import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatTime } from "@/lib/time-utils";
import type { SessionItem, Translate } from "../types";

type TimelineCardProps = {
  t: Translate;
  todaySessions: SessionItem[];
  tomorrowSessions: SessionItem[];
};

export function TimelineCard({
  t,
  todaySessions,
  tomorrowSessions,
}: TimelineCardProps) {
  const hasTodayPanel = todaySessions.length > 0;
  const hasTomorrowPanel = tomorrowSessions.length > 0;

  if (!hasTodayPanel && !hasTomorrowPanel) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hasTodayPanel ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("today.title")}</CardTitle>
            <CardDescription>{t("today.description")}</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-2">
            {todaySessions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">
                    {item.courseName}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {item.location}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-sm">
                    {formatTime(item.startTime)}-{formatTime(item.endTime)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDuration(item.startTime, item.endTime)}
                  </p>
                </div>
              </div>
            ))}
          </CardPanel>
        </Card>
      ) : null}

      {hasTomorrowPanel ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("tomorrow.title")}</CardTitle>
            <CardDescription>{t("tomorrow.description")}</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-2">
            {tomorrowSessions.map((item) => (
              <div key={item.id} className="rounded-md border px-3 py-2">
                <p className="font-medium text-sm">{item.courseName}</p>
                <p className="text-muted-foreground text-xs">
                  {formatTime(item.startTime)}-{formatTime(item.endTime)} ·{" "}
                  {item.location}
                </p>
              </div>
            ))}
          </CardPanel>
        </Card>
      ) : null}
    </div>
  );
}
