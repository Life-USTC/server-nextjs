import { describe, expect, it } from "vitest";
import { resolveRequestRelativeUrl } from "@/lib/request-origin";

describe("resolveRequestRelativeUrl", () => {
  it("uses forwarded host and protocol when present", () => {
    const request = new Request("http://127.0.0.1:3000/api/foo", {
      headers: {
        "x-forwarded-host": "example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(resolveRequestRelativeUrl("/dashboard", request).toString()).toBe(
      "https://example.com/dashboard",
    );
  });

  it("falls back to request host when forwarded headers are missing", () => {
    const request = new Request("http://app.internal:3000/api/foo", {
      headers: {
        host: "app.internal:3000",
      },
    });

    expect(resolveRequestRelativeUrl("/dashboard", request).toString()).toBe(
      "http://app.internal:3000/dashboard",
    );
  });

  it("ignores unsafe forwarded protocol values", () => {
    const request = new Request("http://app.internal:3000/api/foo", {
      headers: {
        "x-forwarded-host": "example.com",
        "x-forwarded-proto": "javascript",
      },
    });

    expect(resolveRequestRelativeUrl("/dashboard", request).toString()).toBe(
      "http://example.com/dashboard",
    );
  });
});
