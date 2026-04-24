import { formatShanghaiTimestamp } from "@/lib/time/shanghai-format";

const LOG_LEVEL_ORDER = ["debug", "info", "warn", "error"] as const;
type AppLogLevel = (typeof LOG_LEVEL_ORDER)[number];

type AppLogContext = Record<string, unknown>;

export function shouldLog(level: AppLogLevel): boolean {
  const configured = process.env.LOG_LEVEL ?? "info";
  const configuredIdx = LOG_LEVEL_ORDER.indexOf(configured as AppLogLevel);
  const levelIdx = LOG_LEVEL_ORDER.indexOf(level);
  const effectiveConfigIdx = configuredIdx >= 0 ? configuredIdx : 1;
  return levelIdx >= effectiveConfigIdx;
}

function serializeError(error: unknown) {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack
        ? { stack: error.stack }
        : {}),
    };
  }

  return { error };
}

function getLogMethod(level: AppLogLevel) {
  if (level === "error") return console.error;
  if (level === "warn") return console.warn;
  if (level === "debug") return console.debug;
  return console.info;
}

function emitLog(
  prefix: string,
  level: AppLogLevel,
  payload: Record<string, unknown>,
  error?: unknown,
) {
  const method = getLogMethod(level);
  const serializedError = serializeError(error);

  if (process.env.NODE_ENV === "production") {
    const logObj = {
      prefix,
      ...payload,
      ...(serializedError ? { error: serializedError } : {}),
    };
    method(JSON.stringify(logObj));
    return;
  }

  if (serializedError) {
    method(prefix, payload, serializedError);
  } else {
    method(prefix, payload);
  }
}

export function logAppEvent(
  level: AppLogLevel,
  message: string,
  context: AppLogContext = {},
  error?: unknown,
) {
  if (!shouldLog(level)) return;

  const payload = {
    timestamp: formatShanghaiTimestamp(new Date()),
    environment: process.env.NODE_ENV ?? "development",
    runtime: typeof window === "undefined" ? "server" : "client",
    message,
    ...context,
  };

  emitLog("[app]", level, payload, error);
}

export function logApiRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  context: AppLogContext = {},
) {
  if (!shouldLog("info")) return;

  const payload = {
    timestamp: formatShanghaiTimestamp(new Date()),
    environment: process.env.NODE_ENV ?? "development",
    method,
    path,
    status,
    durationMs,
    ...context,
  };

  emitLog("[api]", "info", payload);
}

export function logAuditEvent(
  action: string,
  userId: string | null,
  targetId: string | null,
  metadata: AppLogContext = {},
) {
  if (!shouldLog("info")) return;

  const payload = {
    timestamp: formatShanghaiTimestamp(new Date()),
    environment: process.env.NODE_ENV ?? "development",
    action,
    userId,
    targetId,
    ...metadata,
  };

  emitLog("[audit]", "info", payload);
}

export function logRouteFailure(
  message: string,
  status: number,
  error: unknown,
  context: AppLogContext = {},
) {
  if (status < 500 && process.env.NODE_ENV === "production") {
    return;
  }
  logAppEvent(
    status >= 500 ? "error" : "warn",
    message,
    { status, ...context },
    error,
  );
}

export function logServerActionError(
  message: string,
  error: unknown,
  context: AppLogContext = {},
) {
  logAppEvent("error", message, { source: "server-action", ...context }, error);
}

export function logClientError(
  message: string,
  error: unknown,
  context: AppLogContext = {},
) {
  logAppEvent("warn", message, { source: "client", ...context }, error);
}
