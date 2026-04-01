export function stableSkeletonKeys(length: number, prefix = "skeleton") {
  return Array.from({ length }, (_, index) => `${prefix}-${index}`);
}
