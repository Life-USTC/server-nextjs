import type { ConfigType, ManipulateType } from "dayjs";
import { APP_TIME_ZONE, parseDateInput } from "@/lib/time/parse-date-input";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";

export const APP_TIMESTAMP_FORMAT = "YYYY-MM-DDTHH:mm:ssZ";
export const APP_DATE_ONLY_FORMAT = "YYYY-MM-DD";
export const APP_TIME_ONLY_FORMAT = "HH:mm";
export const APP_DATETIME_LOCAL_FORMAT = "YYYY-MM-DDTHH:mm";

export function formatShanghaiTimestamp(input: ConfigType): string {
  return shanghaiDayjs(input).format(APP_TIMESTAMP_FORMAT);
}

export function formatShanghaiDate(input: ConfigType): string {
  return shanghaiDayjs(input).format(APP_DATE_ONLY_FORMAT);
}

export function formatShanghaiTime(input: ConfigType): string {
  return shanghaiDayjs(input).format(APP_TIME_ONLY_FORMAT);
}

export function toShanghaiDateTimeLocalValue(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const parsed =
    value instanceof Date ? value : (parseDateInput(value) ?? undefined);
  if (!(parsed instanceof Date)) return "";
  return shanghaiDayjs(parsed).format(APP_DATETIME_LOCAL_FORMAT);
}

export function parseShanghaiDateTimeLocalInput(
  value: string,
): Date | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return parseDateInput(trimmed);
}

export function startOfShanghaiDay(input: ConfigType = new Date()): Date {
  return shanghaiDayjs(input).startOf("day").toDate();
}

export function endOfShanghaiDay(input: ConfigType = new Date()): Date {
  return shanghaiDayjs(input)
    .hour(23)
    .minute(59)
    .second(0)
    .millisecond(0)
    .toDate();
}

export function addShanghaiTime(
  input: ConfigType,
  amount: number,
  unit: ManipulateType,
): Date {
  return shanghaiDayjs(input).add(amount, unit).toDate();
}

export function createShanghaiDateTimeFormatter(
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}
