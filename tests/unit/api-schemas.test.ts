import { describe, expect, it } from "vitest";
import { matchSectionCodesRequestSchema } from "@/lib/api-schemas";

describe("matchSectionCodesRequestSchema", () => {
  it("accepts valid payload", () => {
    const result = matchSectionCodesRequestSchema.safeParse({
      codes: ["COMP101.01", "MATH204.02"],
      semesterId: "12",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty codes and invalid code format", () => {
    const empty = matchSectionCodesRequestSchema.safeParse({
      codes: [],
    });
    expect(empty.success).toBe(false);

    const invalidCode = matchSectionCodesRequestSchema.safeParse({
      codes: [""],
    });
    expect(invalidCode.success).toBe(false);
  });
});
