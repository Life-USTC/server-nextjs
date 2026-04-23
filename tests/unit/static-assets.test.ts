import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLifeUstcStaticJson,
  fetchRequiredLifeUstcStaticJson,
  getLifeUstcStaticUrl,
  LIFE_USTC_STATIC_ORIGIN,
} from "@/lib/static-assets";

describe("static asset helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds URLs from the published static origin", () => {
    expect(LIFE_USTC_STATIC_ORIGIN).toBe(
      "https://static.life-ustc.tiankaima.dev",
    );
    expect(getLifeUstcStaticUrl("/geo_data.json")).toBe(
      "https://static.life-ustc.tiankaima.dev/geo_data.json",
    );
  });

  it("returns fallback data for optional static JSON failures", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );

    await expect(
      fetchLifeUstcStaticJson("geo_data.json", { locations: [] }),
    ).resolves.toEqual({ locations: [] });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("throws for required static JSON failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );

    await expect(
      fetchRequiredLifeUstcStaticJson("bus_data_v3.json"),
    ).rejects.toThrow(/Static asset request failed: 404/);
  });
});
