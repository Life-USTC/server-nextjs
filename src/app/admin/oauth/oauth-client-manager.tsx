"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Copy,
  KeyRound,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createOAuthClient, deleteOAuthClient } from "@/app/actions/oauth";
import { PageStatCard, PageStatGrid } from "@/components/page-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createShanghaiDateTimeFormatter } from "@/lib/time/shanghai-format";
import { cn } from "@/lib/utils";

const MCP_TOOLS_SCOPE = "mcp:tools";
const OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD = "client_secret_basic";
const OAUTH_CLIENT_SECRET_POST_AUTH_METHOD = "client_secret_post";
const OAUTH_PUBLIC_CLIENT_AUTH_METHOD = "none";
const DEFAULT_SCOPE_VALUES = ["openid", "profile", MCP_TOOLS_SCOPE];
const DEFAULT_AUTH_METHOD = OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD;

interface OAuthClientInfo {
  clientId: string;
  name: string;
  tokenEndpointAuthMethod: string;
  redirectUris: string[];
  scopes: string[];
  isTrusted: boolean;
  createdAt: string;
}

type AuthMethodOption = {
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

const AUTH_METHOD_OPTIONS: AuthMethodOption[] = [
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

const SCOPE_OPTIONS = [
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

type CreatedCredentials = {
  clientId: string;
  clientSecret: string | null;
  name: string;
  tokenEndpointAuthMethod: string;
  redirectUris: string[];
  scopes: string[];
  isTrusted: boolean;
};

function getClientTypeBadgeVariant(method: string) {
  if (method === OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return "success" as const;
  }
  if (method === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD) {
    return "warning" as const;
  }
  return "info" as const;
}

function getClientTypeLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  method: string,
) {
  if (method === OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return t("clientTypePublic");
  }
  if (method === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD) {
    return t("clientTypeConfidentialPost");
  }
  return t("clientTypeConfidentialBasic");
}

function getScopeInputId(scope: string) {
  return `oauth-scope-${scope.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function parseRedirectUris(value: string) {
  return value
    .split("\n")
    .map((uri) => uri.trim())
    .filter(Boolean);
}

function getAuthMethodOption(value: string) {
  return (
    AUTH_METHOD_OPTIONS.find((option) => option.value === value) ??
    AUTH_METHOD_OPTIONS[0]
  );
}

function getClientPatternDescriptionKey(client: OAuthClientInfo) {
  if (client.isTrusted) {
    return "clientKindTrustedDescription";
  }
  if (client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return "clientKindPublicDescription";
  }
  return "clientKindExternalDescription";
}

function CopyField({
  label,
  value,
  copyLabel,
  onCopy,
  disabled = false,
}: {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <Field className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-stretch gap-2">
        <Button
          type="button"
          className="min-w-0 flex-1 justify-start overflow-x-auto font-mono text-sm"
          onClick={onCopy}
          disabled={disabled}
          variant="outline"
        >
          <span translate="no">{value}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={disabled}
        >
          <Copy className="size-4" />
          {copyLabel}
        </Button>
      </div>
    </Field>
  );
}

function OAuthClientCard({
  client,
  copyValue,
  dateTimeFormatter,
  onDeleteClient,
  t,
}: {
  client: OAuthClientInfo;
  copyValue: (value: string, description: string) => Promise<void>;
  dateTimeFormatter: Intl.DateTimeFormat;
  onDeleteClient: (clientId: string) => Promise<void>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const redirectUris = client.redirectUris.slice(0, 2);
  const hasMoreRedirectUris = client.redirectUris.length > redirectUris.length;

  return (
    <Card className="gap-4 rounded-2xl border-border/80 bg-background/80 py-4 shadow-none">
      <CardPanel className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 text-balance font-semibold text-base">
                {client.name.trim().length > 0 ? (
                  client.name
                ) : (
                  <span className="text-muted-foreground italic">
                    {t("unnamedClient")}
                  </span>
                )}
              </p>
              <Badge
                variant={getClientTypeBadgeVariant(
                  client.tokenEndpointAuthMethod,
                )}
              >
                {getClientTypeLabel(t, client.tokenEndpointAuthMethod)}
              </Badge>
              {client.isTrusted ? (
                <Badge variant="outline">{t("clientTrustTrusted")}</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              {t("createdAtLabel")}:{" "}
              {dateTimeFormatter.format(new Date(client.createdAt))}
            </p>
            <p className="text-muted-foreground text-sm leading-6">
              {t(getClientPatternDescriptionKey(client))}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDeleteClient(client.clientId)}
          >
            {t("deleteClient")}
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-border/70 bg-card/72 p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
              {t("clientIdLabel")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code
                className="min-w-0 flex-1 truncate font-mono text-xs"
                title={client.clientId}
                translate="no"
              >
                {client.clientId}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("copyClientId")}
                onClick={() => copyValue(client.clientId, t("clientIdCopied"))}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/72 p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
              {t("tableColumnRedirects")}
            </p>
            {redirectUris.length === 0 ? (
              <p className="mt-2 text-muted-foreground text-sm">—</p>
            ) : (
              <div className="mt-2 space-y-2">
                {redirectUris.map((redirectUri) => (
                  <div key={redirectUri} className="flex items-start gap-2">
                    <code
                      className="min-w-0 flex-1 break-all font-mono text-xs"
                      translate="no"
                    >
                      {redirectUri}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("copyRedirectUri")}
                      onClick={() =>
                        copyValue(redirectUri, t("redirectUriCopied"))
                      }
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                ))}
                {hasMoreRedirectUris ? (
                  <p className="text-muted-foreground text-xs">
                    {t("previewRedirectCount", {
                      count: client.redirectUris.length,
                    })}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/72 p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
            {t("tableColumnScopes")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {client.scopes.map((scope) => (
              <Badge key={scope} variant="outline">
                <span translate="no">
                  {t(`scope_${scope}`, { fallback: scope })}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </CardPanel>
    </Card>
  );
}

function OAuthClientSection({
  clients,
  copyValue,
  dateTimeFormatter,
  emptyKey,
  onDeleteClient,
  title,
  description,
  t,
}: {
  clients: OAuthClientInfo[];
  copyValue: (value: string, description: string) => Promise<void>;
  dateTimeFormatter: Intl.DateTimeFormat;
  emptyKey: string;
  onDeleteClient: (clientId: string) => Promise<void>;
  title: string;
  description: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline" className="tabular-nums">
            {clients.length}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardPanel className="space-y-3">
        {clients.length === 0 ? (
          <div className="rounded-2xl border border-border/80 border-dashed bg-muted/20 px-4 py-6 text-muted-foreground text-sm">
            {t(emptyKey)}
          </div>
        ) : (
          clients.map((client) => (
            <OAuthClientCard
              key={client.clientId}
              client={client}
              copyValue={copyValue}
              dateTimeFormatter={dateTimeFormatter}
              onDeleteClient={onDeleteClient}
              t={t}
            />
          ))
        )}
      </CardPanel>
    </Card>
  );
}

export function OAuthClientManager({
  clients,
}: {
  clients: OAuthClientInfo[];
}) {
  const locale = useLocale();
  const t = useTranslations("oauth");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedAuthMethod, setSelectedAuthMethod] =
    useState<string>(DEFAULT_AUTH_METHOD);
  const [selectedScopes, setSelectedScopes] =
    useState<string[]>(DEFAULT_SCOPE_VALUES);
  const [redirectDraft, setRedirectDraft] = useState("");
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const draftRedirectUris = parseRedirectUris(redirectDraft);
  const trustedClients = useMemo(
    () => clients.filter((client) => client.isTrusted),
    [clients],
  );
  const publicClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
      ),
    [clients],
  );
  const externalClients = useMemo(
    () => clients.filter((client) => !client.isTrusted),
    [clients],
  );
  const dateTimeFormatter = useMemo(
    () =>
      createShanghaiDateTimeFormatter(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const selectedAuthMethodMeta = getAuthMethodOption(selectedAuthMethod);

  async function copyValue(value: string, description: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: t("copySuccess"),
        description,
        variant: "success",
      });
    } catch {
      toast({
        title: t("copyError"),
        description: t("copyErrorDescription"),
        variant: "destructive",
      });
    }
  }

  function openCreateDialog(nextMethod = DEFAULT_AUTH_METHOD) {
    setSelectedAuthMethod(nextMethod);
    setCreateDialogOpen(true);
  }

  async function onCreateClient(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const redirectUris = parseRedirectUris(
      String(formData.get("redirectUris") ?? ""),
    );
    const tokenEndpointAuthMethod =
      String(formData.get("tokenEndpointAuthMethod") ?? DEFAULT_AUTH_METHOD) ||
      DEFAULT_AUTH_METHOD;
    const scopes = formData
      .getAll("scopes")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const isTrusted =
      tokenEndpointAuthMethod === OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD;

    setLoading(true);
    const result = await createOAuthClient(formData);
    setLoading(false);

    if ("error" in result) {
      toast({
        title: t("createError"),
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setCreatedCredentials({
      clientId: result.clientId,
      clientSecret:
        typeof result.clientSecret === "string" ? result.clientSecret : null,
      name,
      tokenEndpointAuthMethod,
      redirectUris,
      scopes,
      isTrusted,
    });
    setSelectedAuthMethod(DEFAULT_AUTH_METHOD);
    setSelectedScopes([...DEFAULT_SCOPE_VALUES]);
    setRedirectDraft("");
    setFormKey((current) => current + 1);
    setCreateDialogOpen(false);
    toast({
      title: t("createSuccess"),
      description: t("createSuccessDescription"),
      variant: "success",
    });
  }

  async function onDeleteClient(clientId: string) {
    const result = await deleteOAuthClient(clientId);
    if (result.error) {
      toast({
        title: t("deleteError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("deleteSuccess"),
        variant: "success",
      });
    }
  }

  function toggleScope(scope: string, nextChecked: boolean) {
    setSelectedScopes((current) => {
      if (nextChecked) {
        return current.includes(scope) ? current : [...current, scope];
      }
      return current.filter((value) => value !== scope);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_38%)]">
        <CardPanel className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/72 px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
              <ShieldCheck className="size-3.5" />
              <span translate="no">Better Auth OAuth Provider</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-balance font-heading text-2xl tracking-tight md:text-[2rem]">
                {t("panelGuideTitle")}
              </h2>
              <p className="max-w-2xl text-muted-foreground text-sm leading-6 md:text-[0.95rem]">
                {t("panelGuideDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t("strategyFirstPartyTitle")}</Badge>
              <Badge variant="outline">{t("strategyPublicTitle")}</Badge>
              <Badge variant="outline">{t("strategyAdvancedTitle")}</Badge>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/80 bg-background/80 p-5 shadow-xs">
            <p className="font-semibold text-base">{t("createClient")}</p>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              {t("createClientHint")}
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-5 w-full"
              onClick={() => openCreateDialog()}
            >
              <KeyRound className="size-4.5" />
              {t("createClient")}
            </Button>
            <p className="mt-3 text-muted-foreground text-xs leading-5">
              {t("createClientFootnote")}
            </p>
          </div>
        </CardPanel>
      </Card>

      <PageStatGrid>
        <PageStatCard label={t("overviewClients")} value={clients.length} />
        <PageStatCard
          label={t("overviewTrusted")}
          value={trustedClients.length}
        />
        <PageStatCard
          label={t("overviewPublic")}
          value={publicClients.length}
        />
      </PageStatGrid>

      {createdCredentials ? (
        <Card className="border-success">
          <CardHeader>
            <CardTitle>{t("credentialsTitle")}</CardTitle>
            <CardDescription>{t("credentialsWarning")}</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={getClientTypeBadgeVariant(
                  createdCredentials.tokenEndpointAuthMethod,
                )}
              >
                {getClientTypeLabel(
                  t,
                  createdCredentials.tokenEndpointAuthMethod,
                )}
              </Badge>
              {createdCredentials.scopes.map((scope) => (
                <Badge key={scope} variant="outline">
                  <span translate="no">
                    {t(`scope_${scope}`, { fallback: scope })}
                  </span>
                </Badge>
              ))}
              {createdCredentials.isTrusted ? (
                <Badge variant="outline">{t("clientTrustTrusted")}</Badge>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <CopyField
                label={t("clientIdLabel")}
                value={createdCredentials.clientId}
                copyLabel={t("copyClientId")}
                onCopy={() =>
                  copyValue(createdCredentials.clientId, t("clientIdCopied"))
                }
              />

              <CopyField
                label={t("clientSecretLabel")}
                value={
                  createdCredentials.clientSecret ?? t("publicClientNoSecret")
                }
                copyLabel={t("copyClientSecret")}
                disabled={!createdCredentials.clientSecret}
                onCopy={() => {
                  if (!createdCredentials.clientSecret) return;
                  copyValue(
                    createdCredentials.clientSecret,
                    t("clientSecretCopied"),
                  );
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  copyValue(
                    JSON.stringify(
                      {
                        client_id: createdCredentials.clientId,
                        client_secret: createdCredentials.clientSecret,
                        redirect_uris: createdCredentials.redirectUris,
                        token_endpoint_auth_method:
                          createdCredentials.tokenEndpointAuthMethod,
                        scopes: createdCredentials.scopes,
                      },
                      null,
                      2,
                    ),
                    t("credentialsCopied"),
                  )
                }
              >
                <Copy className="size-4" />
                {t("copyCredentials")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreatedCredentials(null)}
              >
                {t("dismissCredentials")}
              </Button>
            </div>
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("strategyTitle")}</CardTitle>
          <CardDescription>{t("strategyDescription")}</CardDescription>
        </CardHeader>
        <CardPanel className="grid gap-4 xl:grid-cols-3">
          {AUTH_METHOD_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <Card
                key={option.value}
                className={cn(
                  "h-full gap-4 rounded-2xl py-4",
                  option.accentClassName,
                )}
              >
                <CardPanel className="space-y-4">
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-2xl border",
                      option.accentIconClassName,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-base">
                        {t(option.strategyTitleKey)}
                      </p>
                      <Badge variant={getClientTypeBadgeVariant(option.value)}>
                        {t(option.labelKey)}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6">
                      {t(option.strategyDescriptionKey)}
                    </p>
                    <p className="text-muted-foreground text-xs leading-5">
                      {t(option.strategyHintKey)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCreateDialog(option.value)}
                  >
                    {t("useThisPattern")}
                  </Button>
                </CardPanel>
              </Card>
            );
          })}
        </CardPanel>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogPopup className="max-h-[min(90vh,48rem)] max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("createClient")}</DialogTitle>
            <DialogDescription>
              {t("createClientDescription")}
            </DialogDescription>
          </DialogHeader>
          <form
            key={formKey}
            action={onCreateClient}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogPanel className="space-y-6">
              <fieldset className="space-y-3">
                <legend className="font-heading font-semibold text-sm">
                  {t("createFlowTitle")}
                </legend>
                <p className="text-muted-foreground text-sm leading-6">
                  {t("createFlowIntro")}
                </p>
                <div className="grid gap-3 xl:grid-cols-3">
                  {AUTH_METHOD_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const inputId = `oauth-auth-method-${option.value}`;
                    const checked = selectedAuthMethod === option.value;

                    return (
                      <label
                        htmlFor={inputId}
                        key={option.value}
                        className={cn(
                          "cursor-pointer rounded-2xl border p-4 transition-colors",
                          checked
                            ? option.accentClassName
                            : "border-border bg-card/72 hover:bg-accent/40",
                        )}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="tokenEndpointAuthMethod"
                          value={option.value}
                          checked={checked}
                          onChange={() => setSelectedAuthMethod(option.value)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-2xl border",
                              checked
                                ? option.accentIconClassName
                                : "border-border bg-background/80 text-muted-foreground",
                            )}
                          >
                            <Icon className="size-4.5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">
                                {t(option.strategyTitleKey)}
                              </span>
                              <Badge
                                variant={getClientTypeBadgeVariant(
                                  option.value,
                                )}
                              >
                                {t(option.labelKey)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs leading-5">
                              {t(option.descriptionKey)}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <Alert variant="info">
                <ShieldCheck className="mt-0.5 size-4" />
                <AlertTitle>{t("panelSecurityTitle")}</AlertTitle>
                <AlertDescription>
                  {t("panelSecurityDescription")}
                </AlertDescription>
              </Alert>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-6">
                  <Field>
                    <FieldLabel htmlFor="oauth-client-name">
                      {t("clientName")}
                    </FieldLabel>
                    <Input
                      id="oauth-client-name"
                      name="name"
                      placeholder={t("clientNamePlaceholder")}
                      required
                    />
                  </Field>

                  <Field>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FieldLabel htmlFor="oauth-redirect-uris">
                        {t("redirectUris")}
                      </FieldLabel>
                      <span
                        aria-live="polite"
                        className="text-muted-foreground text-xs"
                      >
                        {t("previewRedirectCount", {
                          count: draftRedirectUris.length,
                        })}
                      </span>
                    </div>
                    <Textarea
                      id="oauth-redirect-uris"
                      name="redirectUris"
                      className="min-h-32 font-mono text-sm"
                      placeholder={t("redirectUrisPlaceholder")}
                      value={redirectDraft}
                      onChange={(event) => setRedirectDraft(event.target.value)}
                      required
                    />
                    <FieldDescription>{t("redirectUrisHint")}</FieldDescription>
                  </Field>
                </div>

                <Field className="rounded-2xl border border-border/80 bg-muted/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>{t("permissionsTitle")}</FieldLabel>
                    <span
                      aria-live="polite"
                      className="text-muted-foreground text-xs"
                    >
                      {t("previewScopeCount", {
                        count: selectedScopes.length,
                      })}
                    </span>
                  </div>
                  <FieldDescription>{t("permissionsHint")}</FieldDescription>

                  <div className="mt-2 space-y-3">
                    {SCOPE_OPTIONS.map((scope) => {
                      const checked = selectedScopes.includes(scope.value);
                      const inputId = getScopeInputId(scope.value);

                      return (
                        <label
                          htmlFor={inputId}
                          key={scope.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                            checked
                              ? "border-primary/32 bg-primary/5"
                              : "border-border bg-background/80 hover:bg-accent/40",
                          )}
                        >
                          <Checkbox
                            id={inputId}
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleScope(scope.value, Boolean(value))
                            }
                          />
                          <span className="min-w-0 space-y-1">
                            <span className="block font-medium text-sm">
                              <span translate="no">
                                {t(`scope_${scope.value}`, {
                                  fallback: scope.value,
                                })}
                              </span>
                            </span>
                            <span className="block text-muted-foreground text-xs leading-5">
                              {t(scope.descriptionKey)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {selectedScopes.map((scope) => (
                    <input
                      key={scope}
                      type="hidden"
                      name="scopes"
                      value={scope}
                    />
                  ))}

                  <div className="mt-4 rounded-xl border border-border/80 border-dashed bg-background/72 p-3">
                    <p className="font-medium text-sm">
                      {t(selectedAuthMethodMeta.strategyTitleKey)}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs leading-5">
                      {t(selectedAuthMethodMeta.strategyHintKey)}
                    </p>
                  </div>
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-muted-foreground text-xs leading-5">
                  {t("createClientFootnote")}
                </p>
                <Button
                  type="submit"
                  disabled={loading || selectedScopes.length === 0}
                >
                  {loading ? t("creating") : t("createClient")}
                </Button>
              </div>
            </DialogPanel>
          </form>
        </DialogPopup>
      </Dialog>

      {clients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("existingClients")}</CardTitle>
            <CardDescription>{t("existingClientsDescription")}</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className="rounded-2xl border border-border/80 border-dashed bg-muted/20 px-4 py-8 text-muted-foreground text-sm">
              {t("noClients")}
            </div>
          </CardPanel>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <OAuthClientSection
            clients={trustedClients}
            copyValue={copyValue}
            dateTimeFormatter={dateTimeFormatter}
            emptyKey="noTrustedClients"
            onDeleteClient={onDeleteClient}
            title={t("sectionTrustedTitle")}
            description={t("sectionTrustedDescription")}
            t={t}
          />
          <OAuthClientSection
            clients={externalClients}
            copyValue={copyValue}
            dateTimeFormatter={dateTimeFormatter}
            emptyKey="noExternalClients"
            onDeleteClient={onDeleteClient}
            title={t("sectionExternalTitle")}
            description={t("sectionExternalDescription")}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
