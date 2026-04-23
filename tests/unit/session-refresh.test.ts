import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFreshSessionQuery,
  refreshAuthSessionCookieCache,
} from "@/lib/auth/session-refresh";

describe("session refresh helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the Better Auth fresh-session query through one owned helper", () => {
    expect(getFreshSessionQuery()).toEqual({ disableCookieCache: true });
  });

  it("refreshes the session with no-store cache semantics", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    await refreshAuthSessionCookieCache();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/get-session?disableCookieCache=true",
      { cache: "no-store" },
    );
  });
});
