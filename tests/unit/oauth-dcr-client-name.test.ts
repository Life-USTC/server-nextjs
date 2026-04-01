import { describe, expect, it } from "vitest";
import {
  parseOAuthDcrClientName,
  resolveDcrStoredClientName,
} from "@/lib/oauth/client-registration";

describe("parseOAuthDcrClientName", () => {
  it("returns null when no name fields", () => {
    expect(parseOAuthDcrClientName({})).toEqual({ ok: true, name: null });
  });

  it("parses client_name", () => {
    expect(parseOAuthDcrClientName({ client_name: " My App " })).toEqual({
      ok: true,
      name: "My App",
    });
  });

  it("falls back to name when client_name absent", () => {
    expect(parseOAuthDcrClientName({ name: "Alias" })).toEqual({
      ok: true,
      name: "Alias",
    });
  });

  it("prefers client_name over name when both set", () => {
    expect(parseOAuthDcrClientName({ client_name: "A", name: "B" })).toEqual({
      ok: true,
      name: "A",
    });
  });

  it("coerces finite numbers to string", () => {
    expect(parseOAuthDcrClientName({ client_name: 42 })).toEqual({
      ok: true,
      name: "42",
    });
  });

  it("rejects non-string non-number values", () => {
    const r = parseOAuthDcrClientName({ client_name: ["x"] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("string");
    }
  });

  it("trims empty string to null", () => {
    expect(parseOAuthDcrClientName({ client_name: "   " })).toEqual({
      ok: true,
      name: null,
    });
  });
});

describe("resolveDcrStoredClientName", () => {
  it("uses parsed name when present", () => {
    expect(resolveDcrStoredClientName("abc", "My app")).toBe("My app");
  });

  it("derives a label from client_id when name absent", () => {
    expect(
      resolveDcrStoredClientName("LC9v7-9DGenvp7cIb_oloLkpYW_rFzXG", null),
    ).toBe("OAuth client LC9v7-9DGe");
  });
});
