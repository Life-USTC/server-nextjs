import type { LucideIcon } from "lucide-react";
import { Bot, KeyRound, Server, Sparkles } from "lucide-react";

export const MCP_TOOLS_SCOPE = "mcp:tools";
export const OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD = "client_secret_basic";
export const OAUTH_CLIENT_SECRET_POST_AUTH_METHOD = "client_secret_post";
export const OAUTH_PUBLIC_CLIENT_AUTH_METHOD = "none";
export const DEFAULT_SCOPE_VALUES = ["openid", "profile", MCP_TOOLS_SCOPE];
export const DEFAULT_AUTH_METHOD = OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD;

export interface OAuthClientInfo {
  clientId: string;
  name: string;
  tokenEndpointAuthMethod: string;
  redirectUris: string[];
  scopes: string[];
  isTrusted: boolean;
  createdAt: string;
}

export type CreatedCredentials = {
  clientId: string;
  clientSecret: string | null;
  name: string;
  tokenEndpointAuthMethod: string;
  redirectUris: string[];
  scopes: string[];
  isTrusted: boolean;
};

export type OAuthTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export type AuthMethodOption = {
  value: string;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
  strategyTitleKey: string;
  strategyDescriptionKey: string;
  strategyHintKey: string;
  accentClassName: string;
  accentIconClassName: string;
};

export const AUTH_METHOD_OPTIONS: AuthMethodOption[] = [
  {
    value: OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
    icon: Server,
    labelKey: "clientTypeConfidentialBasic",
    descriptionKey: "clientTypeBasicDescription",
    strategyTitleKey: "strategyFirstPartyTitle",
    strategyDescriptionKey: "strategyFirstPartyDescription",
    strategyHintKey: "strategyFirstPartyHint",
    accentClassName:
      "border-sky-500/24 bg-sky-500/[0.08] text-sky-800 dark:text-sky-200",
    accentIconClassName:
      "border-sky-500/24 bg-sky-500/[0.12] text-sky-700 dark:text-sky-200",
  },
  {
    value: OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
    icon: Bot,
    labelKey: "clientTypePublic",
    descriptionKey: "clientTypePublicDescription",
    strategyTitleKey: "strategyPublicTitle",
    strategyDescriptionKey: "strategyPublicDescription",
    strategyHintKey: "strategyPublicHint",
    accentClassName:
      "border-emerald-500/24 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-200",
    accentIconClassName:
      "border-emerald-500/24 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-200",
  },
  {
    value: OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
    icon: Sparkles,
    labelKey: "clientTypeConfidentialPost",
    descriptionKey: "clientTypePostDescription",
    strategyTitleKey: "strategyAdvancedTitle",
    strategyDescriptionKey: "strategyAdvancedDescription",
    strategyHintKey: "strategyAdvancedHint",
    accentClassName:
      "border-amber-500/24 bg-amber-500/[0.08] text-amber-800 dark:text-amber-100",
    accentIconClassName:
      "border-amber-500/24 bg-amber-500/[0.12] text-amber-700 dark:text-amber-100",
  },
];

export const SCOPE_OPTIONS = [
  {
    value: "openid",
    descriptionKey: "scopeOpenIdDescription",
  },
  {
    value: "profile",
    descriptionKey: "scopeProfileDescription",
  },
  {
    value: MCP_TOOLS_SCOPE,
    descriptionKey: "scopeMcpToolsDescription",
  },
] as const;

export function getClientTypeBadgeVariant(method: string) {
  if (method === OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return "success" as const;
  }
  if (method === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD) {
    return "warning" as const;
  }
  return "info" as const;
}

export function getClientTypeLabel(t: OAuthTranslator, method: string) {
  if (method === OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return t("clientTypePublic");
  }
  if (method === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD) {
    return t("clientTypeConfidentialPost");
  }
  return t("clientTypeConfidentialBasic");
}

export function getScopeInputId(scope: string) {
  return `oauth-scope-${scope.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

export function parseRedirectUris(value: string) {
  return value
    .split("\n")
    .map((uri) => uri.trim())
    .filter(Boolean);
}

export function getAuthMethodOption(value: string) {
  return (
    AUTH_METHOD_OPTIONS.find((option) => option.value === value) ??
    AUTH_METHOD_OPTIONS[0]
  );
}

export function getClientPatternDescriptionKey(client: OAuthClientInfo) {
  if (client.isTrusted) {
    return "clientKindTrustedDescription";
  }
  if (client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return "clientKindPublicDescription";
  }
  return "clientKindExternalDescription";
}

export const authMethodLeadIcon = KeyRound;
