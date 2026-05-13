import { describe, expect, it } from "vitest";
import { getAuditRequestMetadata } from "@/lib/audit/request-metadata";

describe("getAuditRequestMetadata", () => {
  it("prefers x-forwarded-for when present", () => {
    const request = new Request("https://example.test", {
      headers: {
        "user-agent": "vitest-agent",
        "x-forwarded-for": "203.0.113.10",
        "x-real-ip": "198.51.100.20",
      },
    });

    expect(getAuditRequestMetadata(request)).toEqual({
      ipAddress: "203.0.113.10",
      userAgent: "vitest-agent",
    });
  });

  it("falls back to x-real-ip and omits missing headers", () => {
    const request = new Request("https://example.test", {
      headers: {
        "x-real-ip": "198.51.100.20",
      },
    });

    expect(getAuditRequestMetadata(request)).toEqual({
      ipAddress: "198.51.100.20",
      userAgent: undefined,
    });
  });
});
