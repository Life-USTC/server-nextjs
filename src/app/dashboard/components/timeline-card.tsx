import { ScheduleSessionLink } from "@/components/schedules/schedule-session-link";
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
              <ScheduleSessionLink
                key={item.id}
                href={
                  item.sectionJwId
                    ? `/sections/${item.sectionJwId}`
                    : "/dashboard/subscriptions/sections"
                }
                courseName={item.courseName}
                location={item.location}
                timeLabel={`${formatTime(item.startTime)}-${formatTime(item.endTime)}`}
                durationLabel={formatDuration(item.startTime, item.endTime)}
                variant="detailed"
              />
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
              <ScheduleSessionLink
                key={item.id}
                href={
                  item.sectionJwId
                    ? `/sections/${item.sectionJwId}`
                    : "/dashboard/subscriptions/sections"
                }
                courseName={item.courseName}
                location={item.location}
                timeLabel={`${formatTime(item.startTime)}-${formatTime(item.endTime)}`}
                durationLabel={formatDuration(item.startTime, item.endTime)}
                variant="detailed"
              />
            ))}
          </CardPanel>
        </Card>
      ) : null}
    </div>
  );
}
