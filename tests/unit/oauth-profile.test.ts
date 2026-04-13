import { describe, expect, it } from "vitest";
import { mapOidcProfileToUser } from "@/lib/auth/oauth-profile";

describe("OAuth profile mapping", () => {
  it("accepts sparse USTC OIDC profiles with only an id", () => {
    expect(
      mapOidcProfileToUser({
        id: "435",
        sub: "435",
        user_id: 435,
        emailVerified: false,
      }),
    ).toEqual({
      id: "435",
      email: "oidc-435@users.local",
      name: "USTC User 435",
      image: undefined,
      emailVerified: false,
    });
  });

  it("preserves provider supplied OIDC profile fields when present", () => {
    expect(
      mapOidcProfileToUser({
        sub: "abc",
        email: "student@example.com",
        email_verified: true,
        name: "Student Name",
        picture: "https://example.com/avatar.png",
      }),
    ).toEqual({
      id: "abc",
      email: "student@example.com",
      name: "Student Name",
      image: "https://example.com/avatar.png",
      emailVerified: true,
    });
  });
});
