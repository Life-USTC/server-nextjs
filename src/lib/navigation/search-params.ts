type SearchParamValue = string | null | undefined;

function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value: SearchParamValue,
) {
  if (value === undefined || value === null || value === "") return;
  params.set(key, value);
}

export function buildSearchParams({
  values,
  preserve,
}: {
  values: Record<string, SearchParamValue>;
  preserve?: Record<string, SearchParamValue>;
}) {
  const params = new URLSearchParams();

  if (preserve) {
    for (const [key, value] of Object.entries(preserve)) {
      appendIfPresent(params, key, value);
    }
  }

  for (const [key, value] of Object.entries(values)) {
    appendIfPresent(params, key, value);
  }

  return params.toString();
}
