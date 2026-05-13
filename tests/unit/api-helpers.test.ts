import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import {
  getRequestSearchParams,
  jsonResponse,
  parseInteger,
  parseIntegerList,
  parseRouteInput,
} from "@/lib/api/helpers";

describe("api helpers", () => {
  it("does not overwrite proxy-owned request id headers", () => {
    const response = jsonResponse({ ok: true });

    expect(response.headers.has("x-request-id")).toBe(false);
  });

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

  it("reads search params from both Request and NextRequest", () => {
    const request = new Request("https://example.test/path?page=2");
    const nextRequest = new NextRequest("https://example.test/path?limit=10");

    expect(getRequestSearchParams(request).get("page")).toBe("2");
    expect(getRequestSearchParams(nextRequest).get("limit")).toBe("10");
  });

  it("parses route input with zod schemas", () => {
    const result = parseRouteInput(
      { page: "2" },
      z.object({ page: z.string() }),
      "Invalid query",
    );

    expect(result).toEqual({ page: "2" });
  });

  it("returns a response for invalid route input", async () => {
    const result = parseRouteInput(
      { page: 2 },
      z.object({ page: z.string() }),
      "Invalid query",
    );

    expect(result).toBeInstanceOf(Response);
    expect(await (result as Response).json()).toEqual({
      error: "Invalid query",
    });
  });
});
