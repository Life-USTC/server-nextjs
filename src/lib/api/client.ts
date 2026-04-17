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
