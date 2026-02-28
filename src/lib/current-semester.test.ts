import { describe, expect, it } from "vitest";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";

type SemesterLike = {
  id: number;
  startDate: Date | null;
  endDate: Date | null;
};

describe("selectCurrentSemesterFromList", () => {
  it("returns the first unfinished semester even when a later semester has started", () => {
    const referenceDate = new Date("2026-02-01T12:00:00.000Z");
    const semesters: SemesterLike[] = [
      {
        id: 1,
        startDate: new Date("2025-09-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T23:59:59.000Z"),
      },
      {
        id: 2,
        startDate: new Date("2026-01-15T00:00:00.000Z"),
        endDate: new Date("2026-09-30T23:59:59.000Z"),
      },
    ];

    const result = selectCurrentSemesterFromList(semesters, referenceDate);

    expect(result?.id).toBe(1);
  });

  it("falls back to the latest semester when all semesters are finished", () => {
    const referenceDate = new Date("2026-02-01T12:00:00.000Z");
    const semesters: SemesterLike[] = [
      {
        id: 1,
        startDate: new Date("2024-09-01T00:00:00.000Z"),
        endDate: new Date("2025-01-31T23:59:59.000Z"),
      },
      {
        id: 2,
        startDate: new Date("2025-02-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T23:59:59.000Z"),
      },
    ];

    const result = selectCurrentSemesterFromList(semesters, referenceDate);

    expect(result?.id).toBe(2);
  });
});
