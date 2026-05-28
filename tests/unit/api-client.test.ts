import { describe, expect, it } from "vitest";
import { extractApiErrorMessage } from "@/lib/api/client";

describe("api client helpers", () => {
  it("extracts plain and Error messages", () => {
    expect(extractApiErrorMessage("  failed  ")).toBe("failed");
    expect(extractApiErrorMessage(new Error("  failed  "))).toBe("failed");
  });

  it("uses the first non-empty direct error string", () => {
    expect(
      extractApiErrorMessage({
        error: "",
        message: "  validation failed  ",
        detail: "ignored",
      }),
    ).toBe("validation failed");
  });

  it("preserves whitespace-only field fallback behavior", () => {
    expect(
      extractApiErrorMessage({
        error: "   ",
        message: "ignored",
      }),
    ).toBeNull();
    expect(
      extractApiErrorMessage({
        error: { message: "   ", detail: "ignored" },
      }),
    ).toBeNull();
    expect(
      extractApiErrorMessage({
        errors: [{ message: "   ", error: "ignored" }],
      }),
    ).toBeNull();
  });

  it("falls back to nested and array error messages", () => {
    expect(
      extractApiErrorMessage({ error: { detail: "  nested failure  " } }),
    ).toBe("nested failure");
    expect(
      extractApiErrorMessage({
        errors: [{ error: "  first item failure  " }],
      }),
    ).toBe("first item failure");
  });

  it("returns null when no usable message is present", () => {
    expect(extractApiErrorMessage(undefined)).toBeNull();
    expect(extractApiErrorMessage({ error: "   ", errors: [] })).toBeNull();
  });
});
