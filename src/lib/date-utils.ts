import dayjs from "dayjs";

export const getWeekStartMonday = (date: dayjs.Dayjs) => {
  const day = date.day();
  const diff = day === 0 ? 6 : day - 1;
  return date.subtract(diff, "day").startOf("day");
};

export const formatDateTime = (date: Date, time: number, locale: string) => {
  const datetime = dayjs(date)
    .hour(Math.floor(time / 100))
    .minute(time % 100)
    .toDate();
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(datetime);
};

export const createWeekDayFormatter = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });
