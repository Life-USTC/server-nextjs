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
  if (typeof errorBody === "string") {
    return errorBody.trim() || null;
  }
  if (errorBody instanceof Error) {
    return errorBody.message?.trim() || null;
  }
  if (!errorBody || typeof errorBody !== "object") {
    return null;
  }

  const anyBody = errorBody as Record<string, unknown>;

  const direct =
    (typeof anyBody.error === "string" && anyBody.error) ||
    (typeof anyBody.message === "string" && anyBody.message) ||
    (typeof anyBody.detail === "string" && anyBody.detail);
  if (direct) {
    return direct.trim() || null;
  }

  const nestedError = anyBody.error;
  if (nestedError && typeof nestedError === "object") {
    const nested = nestedError as Record<string, unknown>;
    const nestedDirect =
      (typeof nested.error === "string" && nested.error) ||
      (typeof nested.message === "string" && nested.message) ||
      (typeof nested.detail === "string" && nested.detail);
    if (nestedDirect) {
      return nestedDirect.trim() || null;
    }
  }

  const errors = anyBody.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (first && typeof first === "object") {
      const firstObj = first as Record<string, unknown>;
      const firstMessage =
        (typeof firstObj.message === "string" && firstObj.message) ||
        (typeof firstObj.error === "string" && firstObj.error);
      if (firstMessage) {
        return firstMessage.trim() || null;
      }
    }
  }

  return null;
}
