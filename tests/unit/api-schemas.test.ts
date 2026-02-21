import { describe, expect, it } from "vitest";
import {
  descriptionUpsertRequestSchema,
  homeworkCreateRequestSchema,
  matchSectionCodesRequestSchema,
} from "@/lib/api-schemas";

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

describe("homeworkCreateRequestSchema", () => {
  it("accepts valid payload", () => {
    const result = homeworkCreateRequestSchema.safeParse({
      sectionId: "12",
      title: "  作业 1  ",
      description: "desc",
      isMajor: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = homeworkCreateRequestSchema.safeParse({
      sectionId: 3,
      title: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("descriptionUpsertRequestSchema", () => {
  it("accepts homework string targetId", () => {
    const result = descriptionUpsertRequestSchema.safeParse({
      targetType: "homework",
      targetId: "hw_123",
      content: "text",
    });
    expect(result.success).toBe(true);
  });

  it("rejects numeric targets with invalid id", () => {
    const result = descriptionUpsertRequestSchema.safeParse({
      targetType: "section",
      targetId: "abc",
      content: "text",
    });
    expect(result.success).toBe(false);
  });
});
