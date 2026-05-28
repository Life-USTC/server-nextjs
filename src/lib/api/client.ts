"use client";

type QueryValue = string | number | boolean | undefined | null;

type ApiOptions = {
  params?: {
    query?: Record<string, QueryValue>;
    path?: Record<string, string>;
  };
  body?: unknown;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

type ApiSuccess<T> = { data: T; error: undefined; response: Response };
type ApiError = { data: undefined; error: unknown; response: Response };
type ApiResult<T> = ApiSuccess<T> | ApiError;

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

function buildUrl(path: string, options?: ApiOptions): string {
  let url = path;

  if (options?.params?.path) {
    for (const [key, value] of Object.entries(options.params.path)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
  }

  if (options?.params?.query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params.query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) {
      url = `${url}?${qs}`;
    }
  }

  return url;
}

async function apiRequest<T>(
  method: string,
  path: string,
  options?: ApiOptions,
): Promise<ApiResult<T>> {
  const url = buildUrl(path, options);

  const headers = mergeHeaders(
    options?.body !== undefined
      ? { "Content-Type": "application/json" }
      : undefined,
    options?.headers,
  );

  const init: RequestInit = {
    method,
    headers,
    credentials: options?.credentials,
  };

  if (options?.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await apiFetch(url, init);

  let body: unknown;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
  }

  if (response.ok) {
    return { data: body as T, error: undefined, response };
  }

  return { data: undefined, error: body, response };
}

export const apiClient = {
  GET: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>("GET", path, options),
  POST: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>("POST", path, options),
  PUT: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>("PUT", path, options),
  DELETE: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>("DELETE", path, options),
  PATCH: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>("PATCH", path, options),
};

const API_ERROR_MESSAGE_KEYS = ["error", "message", "detail"] as const;

function trimmedMessage(value: string | undefined): string | null {
  return value?.trim() || null;
}

function normalizeStringMessage(value: unknown): string | null | undefined {
  if (typeof value !== "string" || !value) {
    return undefined;
  }
  return trimmedMessage(value);
}

function asErrorRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function firstStringMessage(
  record: Record<string, unknown>,
  keys: readonly string[] = API_ERROR_MESSAGE_KEYS,
): string | null | undefined {
  for (const key of keys) {
    const message = normalizeStringMessage(record[key]);
    if (message !== undefined) {
      return message;
    }
  }

  return undefined;
}

function firstRecordMessage(
  value: unknown,
  keys: readonly string[] = API_ERROR_MESSAGE_KEYS,
): string | null | undefined {
  const record = asErrorRecord(value);
  return record ? firstStringMessage(record, keys) : undefined;
}

export function extractApiErrorMessage(errorBody: unknown): string | null {
  if (typeof errorBody === "string") {
    return trimmedMessage(errorBody);
  }
  if (errorBody instanceof Error) {
    return trimmedMessage(errorBody.message);
  }

  const anyBody = asErrorRecord(errorBody);
  if (!anyBody) {
    return null;
  }

  const direct = firstStringMessage(anyBody);
  if (direct !== undefined) {
    return direct;
  }

  const nestedDirect = firstRecordMessage(anyBody.error);
  if (nestedDirect !== undefined) {
    return nestedDirect;
  }

  const errors = anyBody.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const firstMessage = firstRecordMessage(errors[0], ["message", "error"]);
    if (firstMessage !== undefined) {
      return firstMessage;
    }
  }

  return null;
}
