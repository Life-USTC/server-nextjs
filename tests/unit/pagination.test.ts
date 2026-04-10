import { describe, expect, it } from "vitest";
import { getPaginationTokens } from "@/lib/navigation/pagination";

describe("getPaginationTokens", () => {
  it("returns [1] for a single page", () => {
    expect(getPaginationTokens({ currentPage: 1, totalPages: 1 })).toEqual([1]);
  });

  it("returns [1] when totalPages is 0", () => {
    expect(getPaginationTokens({ currentPage: 1, totalPages: 0 })).toEqual([1]);
  });

  it("returns all pages when totalPages <= maxVisible (default 5)", () => {
    expect(getPaginationTokens({ currentPage: 1, totalPages: 3 })).toEqual([
      1, 2, 3,
    ]);
    expect(getPaginationTokens({ currentPage: 2, totalPages: 5 })).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("returns all pages when totalPages <= custom maxVisible", () => {
    expect(
      getPaginationTokens({ currentPage: 1, totalPages: 7, maxVisible: 7 }),
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("includes ellipsis before end when current is near start", () => {
    const tokens = getPaginationTokens({ currentPage: 1, totalPages: 10 });
    expect(tokens[0]).toBe(1);
    expect(tokens).toContain("ellipsis");
    expect(tokens[tokens.length - 1]).toBe(10);
  });

  it("includes ellipsis after start when current is near end", () => {
    const tokens = getPaginationTokens({ currentPage: 10, totalPages: 10 });
    expect(tokens[0]).toBe(1);
    expect(tokens).toContain("ellipsis");
    expect(tokens[tokens.length - 1]).toBe(10);
  });

  it("includes ellipsis on both sides when current is in middle", () => {
    const tokens = getPaginationTokens({ currentPage: 5, totalPages: 10 });
    expect(tokens[0]).toBe(1);
    expect(tokens[tokens.length - 1]).toBe(10);
    // Two ellipsis markers
    const ellipses = tokens.filter((t) => t === "ellipsis");
    expect(ellipses.length).toBe(2);
  });

  it("always starts with 1 and ends with totalPages for large sets", () => {
    for (const current of [1, 5, 10, 15, 20]) {
      const tokens = getPaginationTokens({
        currentPage: current,
        totalPages: 20,
      });
      expect(tokens[0]).toBe(1);
      expect(tokens[tokens.length - 1]).toBe(20);
    }
  });

  it("defaults maxVisible to 5", () => {
    // With 10 pages and page 5, default maxVisible=5 → window of 5 numeric pages
    const tokens = getPaginationTokens({ currentPage: 5, totalPages: 10 });
    const numericTokens = tokens.filter((t) => typeof t === "number");
    // 1 (boundary) + window pages + totalPages (boundary) — some overlap possible
    // The window itself is 5 pages, but boundary pages (1 and 10) are added separately
    // so numeric count depends on overlap with boundaries
    expect(numericTokens.length).toBeGreaterThanOrEqual(5);
  });

  it("clamps maxVisible minimum to 3", () => {
    const tokens = getPaginationTokens({
      currentPage: 5,
      totalPages: 10,
      maxVisible: 1,
    });
    // With maxVisible clamped to 3, we still get a reasonable pagination
    const numericTokens = tokens.filter((t) => typeof t === "number");
    expect(numericTokens.length).toBeGreaterThanOrEqual(3);
  });

  it("does not produce duplicate page numbers", () => {
    for (const current of [1, 2, 3, 8, 9, 10]) {
      const tokens = getPaginationTokens({
        currentPage: current,
        totalPages: 10,
      });
      const numbers = tokens.filter((t): t is number => typeof t === "number");
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it("page numbers are in ascending order", () => {
    const tokens = getPaginationTokens({ currentPage: 6, totalPages: 20 });
    const numbers = tokens.filter((t): t is number => typeof t === "number");
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });
});
