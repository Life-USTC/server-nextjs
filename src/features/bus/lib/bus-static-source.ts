import * as fs from "node:fs";
import * as path from "node:path";
import type { BusStaticPayload } from "./bus-types";

const BUS_DATA_CANDIDATES = [
  ["static", "bus_data_v3.json"],
  ["build", "bus_data_v3.json"],
] as const;

export function resolveStaticRepoRoot() {
  const configuredRoot = process.env.LIFE_USTC_STATIC_REPO?.trim();
  if (configuredRoot) {
    return path.resolve(configuredRoot);
  }

  return path.resolve(process.cwd(), "../static");
}

export function resolveBusDataFile(repoRoot = resolveStaticRepoRoot()) {
  for (const segments of BUS_DATA_CANDIDATES) {
    const candidate = path.join(repoRoot, ...segments);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function loadBusStaticPayload(repoRoot = resolveStaticRepoRoot()) {
  const filePath = resolveBusDataFile(repoRoot);
  if (!filePath) {
    throw new Error(`Bus data file not found under ${repoRoot}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as BusStaticPayload;
}
