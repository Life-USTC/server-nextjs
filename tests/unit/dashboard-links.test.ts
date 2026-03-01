import { describe, expect, it } from "vitest";
import {
  recommendDashboardLinks,
  USTC_DASHBOARD_LINKS,
} from "@/lib/dashboard-links";

describe("dashboard link recommendations", () => {
  it("returns most-clicked links first", () => {
    const result = recommendDashboardLinks({
      mail: 2,
      jw: 8,
      library: 3,
      network: 1,
    });

    expect(result.map((item) => item.slug)).toEqual(["jw", "library", "mail"]);
  });

  it("falls back to deterministic order when no history exists", () => {
    const result = recommendDashboardLinks({});

    expect(result).toHaveLength(3);
    expect(
      result.every((item) =>
        USTC_DASHBOARD_LINKS.some((link) => link.slug === item.slug),
      ),
    ).toBe(true);
  });
});
