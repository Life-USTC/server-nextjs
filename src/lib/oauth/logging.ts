import { formatShanghaiTimestamp } from "@/lib/time/shanghai-format";

type OAuthLogLevel = "warn" | "error" | "info";

type OAuthLogContext = {
  route: string;
  event: string;
  status?: number;
  reason?: string;
  grantType?: string | null;
  registeredAuthMethod?: string | null;
  requestAuthMethod?: string | null;
  clientId?: string | null;
  redirectUri?: string | null;
  resource?: string | null;
  scope?: string | string[] | null;
  userId?: string | null;
};

export function logOAuthEvent(
  level: OAuthLogLevel,
  context: OAuthLogContext,
  error?: unknown,
) {
  const method =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;

  const payload = {
    timestamp: formatShanghaiTimestamp(new Date()),
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    ...sanitizeOAuthLogContext(context),
  };
  const serializedError = serializeError(error);

  if (serializedError) {
    method("[oauth]", payload, serializedError);
    return;
  }

  method("[oauth]", payload);
}

function sanitizeOAuthLogContext(context: OAuthLogContext) {
  return {
    ...context,
    clientId: summarizeIdentifier(context.clientId),
    redirectUri: summarizeUri(context.redirectUri),
    resource: summarizeUri(context.resource),
    scope: summarizeScope(context.scope),
  };
}

function summarizeIdentifier(value?: string | null) {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function summarizeUri(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[invalid-uri]";
  }
}

function summarizeScope(scope?: string | string[] | null) {
  if (!scope) return null;
  const values =
    typeof scope === "string" ? scope.split(" ").filter(Boolean) : scope;
  return values.slice(0, 8);
}

function serializeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return { error };
}
