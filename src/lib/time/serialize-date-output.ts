import { formatShanghaiTimestamp } from "@/lib/time/shanghai-format";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toShanghaiIsoString(date: Date): string {
  return formatShanghaiTimestamp(date);
}

export function serializeDatesDeep<T>(value: T): T {
  if (value instanceof Date) {
    return toShanghaiIsoString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDatesDeep(item)) as T;
  }
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = serializeDatesDeep(item);
  }
  return out as T;
}
