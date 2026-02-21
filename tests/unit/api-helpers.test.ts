import { describe, expect, it } from "vitest";
import {
  parseInteger,
  parseIntegerList,
  parseOptionalInt,
} from "@/lib/api-helpers";

describe("api-helpers integer parsing", () => {
  it("accepts safe integers from string and number", () => {
    expect(parseInteger("42")).toBe(42);
    expect(parseInteger("  -7 ")).toBe(-7);
    expect(parseInteger(9)).toBe(9);
  });

  it("rejects partial and invalid numeric formats", () => {
    expect(parseInteger("12abc")).toBeNull();
    expect(parseInteger("3.14")).toBeNull();
    expect(parseInteger(3.14)).toBeNull();
    expect(parseInteger("")).toBeNull();
    expect(parseInteger(" ")).toBeNull();
    expect(parseInteger(undefined)).toBeNull();
  });

  it("parses integer list and drops invalid entries", () => {
    expect(parseIntegerList("1,2,foo, 3")).toEqual([1, 2, 3]);
    expect(parseIntegerList(" ")).toEqual([]);
    expect(parseIntegerList(null)).toEqual([]);
  });

  it("parseOptionalInt shares integer semantics", () => {
    expect(parseOptionalInt("100")).toBe(100);
    expect(parseOptionalInt("10x")).toBeNull();
  });
});
