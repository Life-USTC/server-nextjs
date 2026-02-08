import dayjs from "dayjs";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { formatDuration, formatTime } from "@/lib/time-utils";
import type { SessionItem, TimeSlot, Translate } from "../types";

type WeekTableProps = {
  t: Translate;
  timeSlots: TimeSlot[];
  weekDays: dayjs.Dayjs[];
  weeklySessions: SessionItem[];
  weekDayFormatter: Intl.DateTimeFormat;
};

export function WeekTable({
  t,
  timeSlots,
  weekDays,
  weeklySessions,
  weekDayFormatter,
}: WeekTableProps) {
  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("week.title")}</CardTitle>
          <CardDescription>{t("week.descriptionTable")}</CardDescription>
        </CardHeader>
        <CardPanel>
          <p className="text-muted-foreground text-sm">{t("week.empty")}</p>
        </CardPanel>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("week.title")}</CardTitle>
        <CardDescription>{t("week.descriptionTable")}</CardDescription>
      </CardHeader>
      <CardPanel>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[880px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 w-32 bg-card">
                  {t("week.time")}
                </TableHead>
                {weekDays.map((day) => (
                  <TableHead
                    key={day.format("YYYY-MM-DD")}
                    className="text-center"
                  >
                    {weekDayFormatter.format(day.toDate())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot) => (
                <TableRow key={slot.key}>
                  <TableCell className="sticky left-0 z-10 bg-card align-top font-medium text-xs">
                    <p>
                      {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDuration(slot.startTime, slot.endTime)}
                    </p>
                  </TableCell>
                  {weekDays.map((day) => {
                    const dayItems = weeklySessions.filter((item) => {
                      const sameDay = dayjs(item.date).isSame(day, "day");
                      const sameSlot =
                        item.startTime === slot.startTime &&
                        item.endTime === slot.endTime;
                      return sameDay && sameSlot;
                    });

                    return (
                      <TableCell
                        key={`${day.format("YYYY-MM-DD")}-${slot.key}`}
                        className="align-top"
                      >
                        {dayItems.length === 0 ? (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {dayItems.map((item) => (
                              <Link
                                key={item.id}
                                href={
                                  item.sectionJwId
                                    ? `/sections/${item.sectionJwId}`
                                    : "/dashboard/subscriptions/sections"
                                }
                                className="block rounded border border-primary/20 bg-primary/5 px-2 py-1 text-xs no-underline transition-colors hover:bg-primary/10"
                              >
                                <p className="truncate font-medium">
                                  {item.courseName}
                                </p>
                                <p className="truncate text-muted-foreground">
                                  {item.location}
                                </p>
                              </Link>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardPanel>
    </Card>
  );
}
