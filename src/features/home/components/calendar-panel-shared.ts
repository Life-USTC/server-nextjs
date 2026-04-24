import type dayjs from "dayjs";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";

export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type CalendarView = "semester" | "month" | "week";

export function parseCalendarView(view: string | undefined): CalendarView {
  if (view === "month" || view === "week" || view === "semester") return view;
  return "semester";
}

export function compactLocation(
  raw: string | null | undefined,
): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  // UI：卡片里只展示最核心的地点（例如教室），不拼接教学楼/校区等额外信息
  const first = value.split(" · ")[0]?.trim();
  return first || undefined;
}

export function parseMonthParam(raw: string | undefined): dayjs.Dayjs | null {
  if (!raw) return null;
  const month = shanghaiDayjs(`${raw}-01`);
  if (!month.isValid()) return null;
  return month.startOf("month");
}

export function parseWeekParam(raw: string | undefined): dayjs.Dayjs | null {
  if (!raw) return null;
  const date = shanghaiDayjs(raw);
  if (!date.isValid()) return null;
  return date.startOf("day");
}

export function getWeekStart(date: dayjs.Dayjs, weekStartsOn: 0 | 1) {
  let start = date.startOf("day");
  while (start.day() !== weekStartsOn) {
    start = start.subtract(1, "day");
  }
  return start;
}
