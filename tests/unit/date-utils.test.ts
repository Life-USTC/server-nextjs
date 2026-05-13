import { describe, expect, it } from "vitest";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import {
  getDefaultWeekRange,
  getDefaultWeekStart,
  isSameDefaultWeek,
} from "@/shared/lib/date-utils";

describe("default week helpers", () => {
  it("uses Monday as the shared week boundary", () => {
    const date = shanghaiDayjs("2026-03-18T10:00:00+08:00");

    expect(getDefaultWeekStart(date).format("YYYY-MM-DD")).toBe("2026-03-16");
  });

  it("keeps the next Sunday in the same shared week", () => {
    const ref = shanghaiDayjs("2026-03-16T10:00:00+08:00");
    const due = shanghaiDayjs("2026-03-22T09:00:00+08:00");

    expect(isSameDefaultWeek(ref, due)).toBe(true);
  });

  it("excludes the previous Sunday from the shared week", () => {
    const ref = shanghaiDayjs("2026-03-18T10:00:00+08:00");
    const due = shanghaiDayjs("2026-03-15T09:00:00+08:00");
    const { start, endExclusive } = getDefaultWeekRange(ref);

    expect(isSameDefaultWeek(ref, due)).toBe(false);
    expect(due.isBefore(start)).toBe(true);
    expect(due.isBefore(endExclusive)).toBe(true);
  });
});
