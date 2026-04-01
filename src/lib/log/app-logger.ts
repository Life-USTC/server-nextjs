import { formatShanghaiTimestamp } from "@/lib/time/shanghai-format";

type AppLogLevel = "info" | "warn" | "error";

type AppLogContext = Record<string, unknown>;

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
  return console.info;
}

export function logAppEvent(
  level: AppLogLevel,
  message: string,
  context: AppLogContext = {},
  error?: unknown,
) {
  const payload = {
    timestamp: formatShanghaiTimestamp(new Date()),
    environment: process.env.NODE_ENV ?? "development",
    runtime: typeof window === "undefined" ? "server" : "client",
    message,
    ...context,
  };
  const serializedError = serializeError(error);
  const method = getLogMethod(level);

  if (serializedError) {
    method("[app]", payload, serializedError);
    return;
  }

  method("[app]", payload);
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
