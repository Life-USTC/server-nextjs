import {
  DEFAULT_OAUTH_CLIENT_SCOPES,
  MCP_TOOLS_SCOPE,
} from "@/lib/oauth/utils";

export const DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES = [
  ...DEFAULT_OAUTH_CLIENT_SCOPES,
  MCP_TOOLS_SCOPE,
];

type ValidationErrorResult = { error: string };
type ScopesResult = ValidationErrorResult | { scopes: string[] };

const SUPPORTED_DYNAMIC_CLIENT_SCOPES = new Set([
  ...DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES,
  "offline_access",
]);

export function resolveOAuthClientScopes(options: {
  defaultScopes: string[];
  requestedScopes?: string[] | string | null;
}): ScopesResult {
  const requestedScopes =
    typeof options.requestedScopes === "string"
      ? options.requestedScopes.split(" ").filter(Boolean)
      : (options.requestedScopes ?? []);

  if (requestedScopes.length === 0) {
    return { scopes: [...options.defaultScopes] };
  }

  const invalidScopes = requestedScopes.filter(
    (scope) => !SUPPORTED_DYNAMIC_CLIENT_SCOPES.has(scope),
  );

  if (invalidScopes.length > 0) {
    return {
      error: `Unsupported scopes requested: ${invalidScopes.join(", ")}`,
    };
  }

  return { scopes: [...new Set(requestedScopes)] };
}
