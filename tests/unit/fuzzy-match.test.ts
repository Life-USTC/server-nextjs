import { describe, expect, it } from "vitest";
import { findClosestMatches } from "@/lib/fuzzy-match";

describe("findClosestMatches", () => {
  it("filters unrelated section codes that only share a short generic prefix", () => {
    expect(
      findClosestMatches("DEV-CS201.0", [
        "DEV-CS201.01",
        "DEV-MA212.02",
        "DEV-PH230.03",
      ]),
    ).toEqual(["DEV-CS201.01"]);
  });

  it("returns suggestions for 3-character codes without digit (fallback chunk path)", () => {
    // "MAT" has no digit so is not a "significant" chunk; the code falls back
    // to using it as the lookup prefix anyway, so matches should still surface.
    const result = findClosestMatches("MAT", ["MAT201", "MAT101", "PHYSABC"]);
    expect(result).toContain("MAT201");
    expect(result).toContain("MAT101");
    expect(result).not.toContain("PHYSABC");
  });

  it("returns suggestions for 3-char codes with digit (significant chunk path)", () => {
    // "201" has a digit so is a significant chunk; candidates sharing the token
    // should be preferred over unrelated ones.
    const result = findClosestMatches("MA201", [
      "MA201.01",
      "MA201.02",
      "PH230.03",
    ]);
    expect(result).toContain("MA201.01");
    expect(result).not.toContain("PH230.03");
  });
});
