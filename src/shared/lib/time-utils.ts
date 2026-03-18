import dayjs from "dayjs";

function isZhLocale(locale: string): boolean {
  const l = locale.toLowerCase().replace(/_/g, "-");
  return l === "zh-cn" || l.startsWith("zh-") || l === "zh";
}

/** Monday-based week start (aligned with common 本周 usage). */
function mondayStart(d: dayjs.Dayjs): dayjs.Dayjs {
  const x = d.clone().startOf("day");
  const dow = x.day();
  const diff = dow === 0 ? -6 : 1 - dow;
  return x.add(diff, "day");
}

function sameMondayWeek(a: dayjs.Dayjs, b: dayjs.Dayjs): boolean {
  return mondayStart(a).isSame(mondayStart(b), "day");
}

function intlLocale(locale: string): string {
  const l = locale.replace(/_/g, "-");
  const low = l.toLowerCase();
  if (low === "zh-cn" || low.startsWith("zh-") || low === "zh") return "zh-CN";
  return l.length >= 2 ? l : "en-US";
}

/**
 * Human-friendly deadline: 今天/明天/昨天、同周星期、同年省略年份等。
 */
export function formatSmartDateTime(
  input: Date | string | number,
  referenceInput: Date | string | number,
  locale: string,
): string {
  const due = dayjs(input);
  const ref = dayjs(referenceInput);
  const isZh = isZhLocale(locale);
  const time = due.format("HH:mm");
  const il = intlLocale(locale);

  if (due.isSame(ref, "day")) {
    return isZh ? `今天 ${time}` : `Today, ${time}`;
  }
  if (due.isSame(ref.add(1, "day"), "day")) {
    return isZh ? `明天 ${time}` : `Tomorrow, ${time}`;
  }
  if (due.isSame(ref.subtract(1, "day"), "day")) {
    return isZh ? `昨天 ${time}` : `Yesterday, ${time}`;
  }

  if (sameMondayWeek(due, ref)) {
    const wk = new Intl.DateTimeFormat(il, { weekday: "short" }).format(
      due.toDate(),
    );
    return isZh ? `${wk} ${time}` : `${wk}, ${time}`;
  }

  const sameYear = due.year() === ref.year();
  if (isZh) {
    if (sameYear) {
      return `${due.month() + 1}月${due.date()}日 ${time}`;
    }
    return `${due.year()}年${due.month() + 1}月${due.date()}日 ${time}`;
  }

  const d = due.toDate();
  if (sameYear) {
    return new Intl.DateTimeFormat(il, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
  return new Intl.DateTimeFormat(il, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Date-only smart label (e.g. todo due date): no time fragment.
 */
export function formatSmartDate(
  input: Date | string | number,
  referenceInput: Date | string | number,
  locale: string,
): string {
  const due = dayjs(input).startOf("day");
  const ref = dayjs(referenceInput).startOf("day");
  const isZh = isZhLocale(locale);
  const il = intlLocale(locale);

  if (due.isSame(ref, "day")) {
    return isZh ? "今天" : "Today";
  }
  if (due.isSame(ref.add(1, "day"), "day")) {
    return isZh ? "明天" : "Tomorrow";
  }
  if (due.isSame(ref.subtract(1, "day"), "day")) {
    return isZh ? "昨天" : "Yesterday";
  }

  if (sameMondayWeek(due, ref)) {
    return new Intl.DateTimeFormat(il, { weekday: "long" }).format(
      due.toDate(),
    );
  }

  const sameYear = due.year() === ref.year();
  if (isZh) {
    if (sameYear) {
      return `${due.month() + 1}月${due.date()}日`;
    }
    return `${due.year()}年${due.month() + 1}月${due.date()}日`;
  }

  const d = due.toDate();
  if (sameYear) {
    return new Intl.DateTimeFormat(il, {
      month: "short",
      day: "numeric",
    }).format(d);
  }
  return new Intl.DateTimeFormat(il, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Formats a time integer (hhmm or hmm) to hh:mm string format
 * @param time - Integer representing time (e.g., 800, 1030, 1400)
 * @returns Formatted time string (e.g., "08:00", "10:30", "14:00")
 */
export function formatTime(time: number | null | undefined): string {
  if (time === null || time === undefined) return "—";

  const timeStr = String(time).padStart(4, "0");
  const hours = timeStr.slice(0, 2);
  const minutes = timeStr.slice(2, 4);

  return `${hours}:${minutes}`;
}

// Converts hhmm integers to minutes for easier duration math.
export function toMinutes(time: number | null | undefined): number {
  if (time === null || time === undefined) return 0;
  return Math.floor(time / 100) * 60 + (time % 100);
}

// Formats a duration between two hhmm integers into a human-readable string.
export function formatDuration(startTime: number, endTime: number): string {
  const minutes = Math.max(toMinutes(endTime) - toMinutes(startTime), 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
