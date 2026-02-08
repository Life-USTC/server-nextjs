import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { formatTime } from "@/lib/time-utils";
import type { ExamItem, Translate } from "../types";

type ExamsCardProps = {
  t: Translate;
  locale: string;
  upcomingExams: ExamItem[];
};

export function ExamsCard({ t, locale, upcomingExams }: ExamsCardProps) {
  if (upcomingExams.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t("radar.title")}</CardTitle>
        <CardDescription>{t("radar.description")}</CardDescription>
      </CardHeader>
      <CardPanel className="space-y-2">
        {upcomingExams.map((exam) => (
          <div key={exam.id} className="rounded-md border px-3 py-2">
            <p className="truncate font-medium text-sm">{exam.courseName}</p>
            <p className="text-muted-foreground text-xs">
              {exam.date
                ? new Intl.DateTimeFormat(locale, {
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                  }).format(exam.date)
                : "—"}
              {exam.startTime !== null && exam.endTime !== null
                ? ` · ${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
                : ""}
            </p>
          </div>
        ))}
      </CardPanel>
    </Card>
  );
}
