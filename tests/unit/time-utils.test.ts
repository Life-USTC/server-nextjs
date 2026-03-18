import { describe, expect, it } from "vitest";
import { formatSmartDate, formatSmartDateTime } from "@/shared/lib/time-utils";

describe("formatSmartDateTime", () => {
  it("shows 今天 for same calendar day (zh)", () => {
    const ref = new Date("2026-03-17T10:00:00+08:00");
    const due = new Date("2026-03-17T23:00:00+08:00");
    expect(formatSmartDateTime(due, ref, "zh-cn")).toBe("今天 23:00");
  });

  it("omits year when same year but not same week (zh)", () => {
    const ref = new Date("2026-03-17T10:00:00+08:00");
    const due = new Date("2026-04-20T15:30:00+08:00");
    expect(formatSmartDateTime(due, ref, "zh-cn")).toBe("4月20日 15:30");
  });

  it("includes year when different from reference year (zh)", () => {
    const ref = new Date("2026-03-17T10:00:00+08:00");
    const due = new Date("2025-12-01T09:00:00+08:00");
    expect(formatSmartDateTime(due, ref, "zh-cn")).toBe("2025年12月1日 09:00");
  });
});

describe("formatSmartDate", () => {
  it("date-only today (zh)", () => {
    const ref = new Date("2026-03-17T10:00:00+08:00");
    const due = new Date("2026-03-17T08:00:00+08:00");
    expect(formatSmartDate(due, ref, "zh-cn")).toBe("今天");
  });
});
