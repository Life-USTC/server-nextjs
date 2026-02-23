"use client";

import createClient from "openapi-fetch";
import type { paths } from "@/generated/openapi";

const DEFAULT_CREDENTIALS: RequestCredentials = "include";

function mergeHeaders(...headerSets: Array<HeadersInit | undefined>): Headers {
  const mergedHeaders = new Headers();

  for (const headerSet of headerSets) {
    if (!headerSet) {
      continue;
    }

    for (const [key, value] of new Headers(headerSet).entries()) {
      mergedHeaders.set(key, value);
    }
  }

  return mergedHeaders;
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (input instanceof Request) {
    const headers = mergeHeaders(input.headers, init?.headers);

    return fetch(
      new Request(input, {
        ...init,
        credentials:
          init?.credentials ?? input.credentials ?? DEFAULT_CREDENTIALS,
        headers,
      }),
    );
  }

  const headers = mergeHeaders(init?.headers);

  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? DEFAULT_CREDENTIALS,
    headers,
  });
}

export const apiClient = createClient<paths>({
  baseUrl: "",
  fetch: apiFetch,
});

export function extractApiErrorMessage(errorBody: unknown): string | null {
  if (!errorBody || typeof errorBody !== "object") {
    return null;
  }

  const error = (errorBody as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}
