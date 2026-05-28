import { describe, expect, it } from "vitest";
import {
  parseShanghaiDateTimeLocalInput,
  toShanghaiDateTimeLocalValue,
} from "@/lib/time/shanghai-format";

describe("Shanghai date-time form helpers", () => {
  it("formats Date and string values for datetime-local inputs", () => {
    expect(
      toShanghaiDateTimeLocalValue(new Date("2026-03-17T10:30:00+08:00")),
    ).toBe("2026-03-17T10:30");
    expect(toShanghaiDateTimeLocalValue("2026-03-17T10:30:00+08:00")).toBe(
      "2026-03-17T10:30",
    );
  });

  it("returns an empty form value for absent or invalid input", () => {
    expect(toShanghaiDateTimeLocalValue(null)).toBe("");
    expect(toShanghaiDateTimeLocalValue(undefined)).toBe("");
    expect(toShanghaiDateTimeLocalValue("not-a-date")).toBe("");
  });

  it("parses blank form input as cleared and invalid input as undefined", () => {
    expect(parseShanghaiDateTimeLocalInput(" ")).toBeNull();
    expect(parseShanghaiDateTimeLocalInput("not-a-date")).toBeUndefined();
  });
});
