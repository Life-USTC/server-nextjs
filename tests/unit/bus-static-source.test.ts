import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBusStaticPayload,
  resolveBusDataFile,
} from "@/features/bus/lib/bus-static-source";

describe("bus static source", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the static payload when present", () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bus-static-"));
    fs.mkdirSync(path.join(repoRoot, "static"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "static", "bus_data_v3.json"),
      JSON.stringify({ versionKey: "static" }),
    );
    fs.mkdirSync(path.join(repoRoot, "build"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "build", "bus_data_v3.json"),
      JSON.stringify({ versionKey: "build" }),
    );

    expect(resolveBusDataFile(repoRoot)).toBe(
      path.join(repoRoot, "static", "bus_data_v3.json"),
    );
  });

  it("loads the payload from the configured repository root", () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bus-static-"));
    fs.mkdirSync(path.join(repoRoot, "build"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "build", "bus_data_v3.json"),
      JSON.stringify({ versionKey: "2026.04" }),
    );

    const payload = loadBusStaticPayload(repoRoot);
    expect(payload).toMatchObject({ versionKey: "2026.04" });
  });

  it("throws when the repository has no bus payload", () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bus-static-"));
    expect(() => loadBusStaticPayload(repoRoot)).toThrow(
      /Bus data file not found/,
    );
  });
});
