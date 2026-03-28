import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { APP_TIME_ZONE } from "@/lib/time/parse-date-input";

dayjs.extend(utc);
dayjs.extend(timezone);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toShanghaiIsoString(date: Date): string {
  return dayjs(date).tz(APP_TIME_ZONE).format("YYYY-MM-DDTHH:mm:ssZ");
}

export function serializeDatesDeep<T>(value: T): T {
  if (value instanceof Date) {
    return toShanghaiIsoString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDatesDeep(item)) as T;
  }
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = serializeDatesDeep(item);
  }
  return out as T;
}
