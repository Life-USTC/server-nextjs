import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_LIFETIME_MS,
  CODE_LIFETIME_MS,
  generateToken,
} from "@/lib/oauth/utils";

describe("oauth/utils", () => {
  it("generates unique URL-safe tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    // Base64url: only [A-Za-z0-9_-]
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates tokens of expected length for given byte count", () => {
    // 16 bytes -> 22 base64url chars (ceil(16 * 4 / 3))
    const short = generateToken(16);
    expect(short.length).toBe(22);

    // 32 bytes -> 43 base64url chars
    const long = generateToken(32);
    expect(long.length).toBe(43);
  });

  it("exports expected lifetime constants", () => {
    expect(CODE_LIFETIME_MS).toBe(10 * 60 * 1000);
    expect(ACCESS_TOKEN_LIFETIME_MS).toBe(60 * 60 * 1000);
  });
});
