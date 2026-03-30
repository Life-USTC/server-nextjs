"use client";

import { Copy, Link2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createOAuthClient, deleteOAuthClient } from "@/app/actions/oauth";
import { useClientTimezone } from "@/components/client-timezone-provider";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  createdAt: string;
}

const AUTH_METHOD_OPTIONS = [
  {
    value: OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
    labelKey: "clientTypeConfidentialBasic",
    descriptionKey: "clientTypeBasicDescription",
  },
  {
    value: OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
    labelKey: "clientTypeConfidentialPost",
    descriptionKey: "clientTypePostDescription",
  },
  {
    value: OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
    labelKey: "clientTypePublic",
    descriptionKey: "clientTypePublicDescription",
  },
] as const;

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
        <button
          type="button"
          className="flex-1 overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2 text-left font-mono text-sm transition-colors hover:bg-muted"
          onClick={onCopy}
          disabled={disabled}
        >
          {value}
        </button>
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

export function OAuthClientManager({
  clients,
}: {
  clients: OAuthClientInfo[];
}) {
  const t = useTranslations("oauth");
  const clientTimeZone = useClientTimezone();
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

  const selectedAuthMethodMeta = AUTH_METHOD_OPTIONS.find(
    (option) => option.value === selectedAuthMethod,
  );
  const draftRedirectUris = parseRedirectUris(redirectDraft);
  const publicClientCount = clients.filter(
    (client) =>
      client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
  ).length;

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        ...(clientTimeZone ? { timeZone: clientTimeZone } : {}),
      }),
    [clientTimeZone],
  );
  const confidentialClientCount = clients.length - publicClientCount;

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
    });
    setSelectedAuthMethod(DEFAULT_AUTH_METHOD);
    setSelectedScopes([...DEFAULT_SCOPE_VALUES]);
    setRedirectDraft("");
    setFormKey((current) => current + 1);
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardPanel className="space-y-1 py-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {t("overviewClients")}
            </p>
            <p className="font-semibold text-2xl">{clients.length}</p>
          </CardPanel>
        </Card>
        <Card>
          <CardPanel className="space-y-1 py-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {t("overviewConfidential")}
            </p>
            <p className="font-semibold text-2xl">{confidentialClientCount}</p>
          </CardPanel>
        </Card>
        <Card>
          <CardPanel className="space-y-1 py-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {t("overviewPublic")}
            </p>
            <p className="font-semibold text-2xl">{publicClientCount}</p>
          </CardPanel>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("createClient")}</CardTitle>
            <CardDescription>{t("createClientDescription")}</CardDescription>
          </CardHeader>
          <form
            key={formKey}
            action={onCreateClient}
            className="flex w-full flex-col gap-4"
          >
            <CardPanel className="space-y-6">
              <Alert variant="info">
                <ShieldCheck className="mt-0.5 size-4" />
                <AlertTitle>{t("panelSecurityTitle")}</AlertTitle>
                <AlertDescription>
                  {t("panelSecurityDescription")}
                </AlertDescription>
              </Alert>

              <div className="grid gap-6 lg:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name">{t("clientName")}</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    placeholder={t("clientNamePlaceholder")}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="tokenEndpointAuthMethod">
                    {t("clientType")}
                  </FieldLabel>
                  <select
                    id="tokenEndpointAuthMethod"
                    name="tokenEndpointAuthMethod"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs"
                    value={selectedAuthMethod}
                    onChange={(event) =>
                      setSelectedAuthMethod(event.target.value)
                    }
                  >
                    {AUTH_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>
                    {selectedAuthMethodMeta
                      ? t(selectedAuthMethodMeta.descriptionKey)
                      : t("clientTypeHint")}
                  </FieldDescription>
                </Field>

                <Field className="lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel htmlFor="redirectUris">
                      {t("redirectUris")}
                    </FieldLabel>
                    <span className="text-muted-foreground text-xs">
                      {t("previewRedirectCount", {
                        count: draftRedirectUris.length,
                      })}
                    </span>
                  </div>
                  <Textarea
                    id="redirectUris"
                    name="redirectUris"
                    className="min-h-28 font-mono text-sm"
                    placeholder={t("redirectUrisPlaceholder")}
                    value={redirectDraft}
                    onChange={(event) => setRedirectDraft(event.target.value)}
                    required
                  />
                  <FieldDescription>{t("redirectUrisHint")}</FieldDescription>
                </Field>

                <Field className="lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>{t("permissionsTitle")}</FieldLabel>
                    <span className="text-muted-foreground text-xs">
                      {t("previewScopeCount", { count: selectedScopes.length })}
                    </span>
                  </div>
                  <FieldDescription>{t("permissionsHint")}</FieldDescription>

                  <div className="grid gap-3 md:grid-cols-3">
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
                              ? "border-primary/40 bg-primary/4"
                              : "border-border bg-card hover:bg-accent/40",
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
                              {t(`scope_${scope.value}`, {
                                fallback: scope.value,
                              })}
                            </span>
                            <span className="block text-muted-foreground text-xs">
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
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  {t("createClientFootnote")}
                </p>
                <Button
                  type="submit"
                  disabled={loading || selectedScopes.length === 0}
                >
                  {loading ? t("creating") : t("createClient")}
                </Button>
              </div>
            </CardPanel>
          </form>
        </Card>

        <div className="space-y-6">
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
                      {t(`scope_${scope}`, { fallback: scope })}
                    </Badge>
                  ))}
                </div>

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
              <CardTitle>{t("previewTitle")}</CardTitle>
              <CardDescription>{t("previewDescription")}</CardDescription>
            </CardHeader>
            <CardPanel className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={getClientTypeBadgeVariant(selectedAuthMethod)}
                  >
                    {getClientTypeLabel(t, selectedAuthMethod)}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {t("previewScopeCount", { count: selectedScopes.length })}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedScopes.map((scope) => (
                    <Badge key={scope} variant="outline">
                      {t(`scope_${scope}`, { fallback: scope })}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-info" />
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium text-sm">
                      {t("previewRedirectCount", {
                        count: draftRedirectUris.length,
                      })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {draftRedirectUris[0]
                        ? t("previewPrimaryRedirect", {
                            redirectUri: draftRedirectUris[0],
                          })
                        : t("redirectUrisHint")}
                    </p>
                  </div>
                </div>
              </div>
            </CardPanel>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("existingClients")}</CardTitle>
          <CardDescription>{t("existingClientsDescription")}</CardDescription>
        </CardHeader>
        <CardPanel>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noClients")}</p>
          ) : (
            <div className="grid gap-4">
              {clients.map((client) => (
                <div key={client.clientId} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{client.name}</p>
                        <Badge
                          variant={getClientTypeBadgeVariant(
                            client.tokenEndpointAuthMethod,
                          )}
                        >
                          {getClientTypeLabel(
                            t,
                            client.tokenEndpointAuthMethod,
                          )}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {t("createdAtLabel")}:{" "}
                          {formatter.format(new Date(client.createdAt))}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {client.scopes.map((scope) => (
                          <Badge key={scope} variant="outline">
                            {t(`scope_${scope}`, { fallback: scope })}
                          </Badge>
                        ))}
                      </div>
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

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <CopyField
                      label={t("clientIdLabel")}
                      value={client.clientId}
                      copyLabel={t("copyClientId")}
                      onCopy={() =>
                        copyValue(client.clientId, t("clientIdCopied"))
                      }
                    />

                    <Field className="space-y-2">
                      <FieldLabel>{t("redirectUris")}</FieldLabel>
                      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                        {client.redirectUris.map((redirectUri) => (
                          <div
                            key={redirectUri}
                            className="flex items-center gap-2 rounded-md bg-background px-2 py-2"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 truncate text-left font-mono text-xs hover:text-foreground"
                              onClick={() =>
                                copyValue(redirectUri, t("redirectUriCopied"))
                              }
                            >
                              {redirectUri}
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyValue(redirectUri, t("redirectUriCopied"))
                              }
                            >
                              <Copy className="size-4" />
                              {t("copyRedirectUri")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
