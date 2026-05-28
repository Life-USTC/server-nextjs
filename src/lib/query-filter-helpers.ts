import { parseInteger, parseIntegerList } from "@/lib/api/helpers";

export type IntegerFilter = number | string | null | undefined;

export const parseIdsFilter = (value: number[] | string | null | undefined) => {
  if (Array.isArray(value)) {
    return value.filter(Number.isInteger);
  }
  return parseIntegerList(value);
};

/**
 * Build a `{ <key>?, code? }` filter object for a related entity.
 * Returns `undefined` if neither id nor code resolves to a value.
 */
export function buildRelatedFilter(
  key: "id" | "jwId",
  idValue: IntegerFilter,
  code?: string | null,
): Record<string, number | string> | undefined {
  const filter: Record<string, number | string> = {};
  const parsedId = parseInteger(idValue);
  if (parsedId !== null) {
    filter[key] = parsedId;
  }
  const trimmedCode = code?.trim();
  if (trimmedCode) {
    filter.code = trimmedCode;
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Assigns a parsed integer value to a dynamic key on a Prisma where input.
 * Uses `as any` for the dynamic key because TypeScript cannot verify
 * string-keyed assignments on strongly-typed Prisma where inputs at compile time.
 */
export function applyIntegerFilter<T extends Record<string, unknown>>(
  where: T,
  key: string,
  value: IntegerFilter,
) {
  const parsed = parseInteger(value);
  if (parsed !== null) {
    Object.assign(where, { [key]: parsed });
  }
}

/**
 * Build a `{ jwId }` filter for a relation, or `undefined` if the value is not a valid integer.
 */
export function buildJwIdFilter(value: IntegerFilter) {
  const jwId = parseInteger(value);
  return jwId === null ? undefined : { jwId };
}
