import { describe, expect, test } from "bun:test";
import {
  serializeDatesDeep,
  toShanghaiIsoString,
} from "@/lib/time/serialize-date-output";

describe("serialize-date-output", () => {
  test("formats date to shanghai iso with offset", () => {
    const value = new Date("2026-03-26T04:00:00.000Z");
    expect(toShanghaiIsoString(value)).toBe("2026-03-26T12:00:00+08:00");
  });

  test("serializes nested Date values", () => {
    const payload = {
      createdAt: new Date("2026-03-26T04:00:00.000Z"),
      nested: {
        dates: [new Date("2026-03-25T16:00:00.000Z")],
      },
    };
    expect(serializeDatesDeep(payload)).toEqual({
      createdAt: "2026-03-26T12:00:00+08:00",
      nested: {
        dates: ["2026-03-26T00:00:00+08:00"],
      },
    });
  });
});
