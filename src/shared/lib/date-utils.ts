import type { Dayjs } from "dayjs";
import { APP_TIME_ZONE } from "@/lib/time/parse-date-input";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";

/** Week starts on Sunday (day 0). Returns the Sunday of the week containing the date. */
export const getWeekStartSunday = (date: Dayjs) => {
  const day = date.day();
  return date.subtract(day, "day").startOf("day");
};

export const formatDateTime = (date: Date, time: number, locale: string) => {
  const datetime = shanghaiDayjs(date)
    .hour(Math.floor(time / 100))
    .minute(time % 100)
    .toDate();
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(datetime);
};

export const createWeekDayFormatter = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });
