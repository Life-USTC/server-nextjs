type SearchParamValue = string | null | undefined;

export function buildSearchParams({
  values,
}: {
  values: Record<string, SearchParamValue>;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  }

  return params.toString();
}
