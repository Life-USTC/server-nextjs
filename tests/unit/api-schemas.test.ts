import { describe, expect, it } from "vitest";
import {
  calendarSubscriptionCreateRequestSchema,
  commentReactionRequestSchema,
  coursesQuerySchema,
  descriptionUpsertRequestSchema,
  homeworkCreateRequestSchema,
  localeUpdateRequestSchema,
  matchSectionCodesRequestSchema,
  schedulesQuerySchema,
  sectionsQuerySchema,
  uploadCreateRequestSchema,
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

describe("other request schemas", () => {
  it("validates upload create payload", () => {
    const valid = uploadCreateRequestSchema.safeParse({
      filename: "a.txt",
      size: "123",
    });
    expect(valid.success).toBe(true);
  });

  it("validates calendar subscription payload", () => {
    const valid = calendarSubscriptionCreateRequestSchema.safeParse({
      sectionIds: [1, 2, 3],
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid reaction type", () => {
    const invalid = commentReactionRequestSchema.safeParse({
      type: "boom",
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects unsupported locale", () => {
    const invalid = localeUpdateRequestSchema.safeParse({
      locale: "fr-fr",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates query schemas", () => {
    expect(
      sectionsQuerySchema.safeParse({ courseId: "1", ids: "1,2" }).success,
    ).toBe(true);
    expect(
      schedulesQuerySchema.safeParse({ weekday: "2", page: "1" }).success,
    ).toBe(true);
    expect(coursesQuerySchema.safeParse({ search: "math" }).success).toBe(true);

    expect(sectionsQuerySchema.safeParse({ courseId: "abc" }).success).toBe(
      false,
    );
    expect(schedulesQuerySchema.safeParse({ weekday: "x" }).success).toBe(
      false,
    );
  });
});
