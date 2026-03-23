"use client";

import { Copy, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createOAuthClient, deleteOAuthClient } from "@/app/actions/oauth";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";

const MCP_TOOLS_SCOPE = "mcp:tools";
const OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD = "client_secret_basic";
const OAUTH_CLIENT_SECRET_POST_AUTH_METHOD = "client_secret_post";
const OAUTH_PUBLIC_CLIENT_AUTH_METHOD = "none";
const DEFAULT_SCOPE_VALUES = ["openid", "profile", MCP_TOOLS_SCOPE];
const DEFAULT_AUTH_METHOD = OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD;

interface OAuthClientInfo {
  id: string;
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
  t: (key: string, values?: Record<string, string>) => string,
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

export function OAuthClientManager({
  clients,
}: {
  clients: OAuthClientInfo[];
}) {
  const t = useTranslations("oauth");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedAuthMethod, setSelectedAuthMethod] =
    useState<string>(DEFAULT_AUTH_METHOD);
  const [selectedScopes, setSelectedScopes] =
    useState<string[]>(DEFAULT_SCOPE_VALUES);
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);

  const selectedAuthMethodMeta = AUTH_METHOD_OPTIONS.find(
    (option) => option.value === selectedAuthMethod,
  );

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
    const redirectUris = String(formData.get("redirectUris") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
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
    setFormKey((current) => current + 1);
    toast({
      title: t("createSuccess"),
      description: t("createSuccessDescription"),
      variant: "success",
    });
  }

  async function onDeleteClient(clientDbId: string) {
    const result = await deleteOAuthClient(clientDbId);
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
                  <p>{t("panelSecurityDescription")}</p>
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
                  <FieldLabel htmlFor="redirectUris">
                    {t("redirectUris")}
                  </FieldLabel>
                  <Textarea
                    id="redirectUris"
                    name="redirectUris"
                    className="min-h-28 font-mono text-sm"
                    placeholder={t("redirectUrisPlaceholder")}
                    required
                  />
                  <FieldDescription>{t("redirectUrisHint")}</FieldDescription>
                </Field>

                <Field className="lg:col-span-2">
                  <FieldLabel>{t("permissionsTitle")}</FieldLabel>
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

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
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

                <Field>
                  <FieldLabel>{t("clientIdLabel")}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                      {createdCredentials.clientId}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyValue(
                          createdCredentials.clientId,
                          t("clientIdCopied"),
                        )
                      }
                    >
                      <Copy className="size-4" />
                      {t("copyClientId")}
                    </Button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel>{t("clientSecretLabel")}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                      {createdCredentials.clientSecret ??
                        t("publicClientNoSecret")}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!createdCredentials.clientSecret}
                      onClick={() => {
                        if (!createdCredentials.clientSecret) return;
                        copyValue(
                          createdCredentials.clientSecret,
                          t("clientSecretCopied"),
                        );
                      }}
                    >
                      <KeyRound className="size-4" />
                      {t("copyClientSecret")}
                    </Button>
                  </div>
                </Field>

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
              </CardPanel>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("panelGuideTitle")}</CardTitle>
              <CardDescription>{t("panelGuideDescription")}</CardDescription>
            </CardHeader>
            <CardPanel className="space-y-3 text-muted-foreground text-sm">
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
                <div>
                  <p className="font-medium text-foreground">
                    {t("guidePermissionsTitle")}
                  </p>
                  <p>{t("guidePermissionsDescription")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <Link2 className="mt-0.5 size-4 shrink-0 text-info" />
                <div>
                  <p className="font-medium text-foreground">
                    {t("guideRedirectTitle")}
                  </p>
                  <p>{t("guideRedirectDescription")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-info" />
                <div>
                  <p className="font-medium text-foreground">
                    {t("guideSecretTitle")}
                  </p>
                  <p>{t("guideSecretDescription")}</p>
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
                <div key={client.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
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
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t("createdAtLabel")}:{" "}
                          {new Date(client.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          {t("clientIdLabel")}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="max-w-full overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                            {client.clientId}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyValue(client.clientId, t("clientIdCopied"))
                            }
                          >
                            <Copy className="size-4" />
                            {t("copyClientId")}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          {t("permissionsTitle")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {client.scopes.map((scope) => (
                            <Badge key={scope} variant="outline">
                              {t(`scope_${scope}`, { fallback: scope })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteClient(client.id)}
                    >
                      {t("deleteClient")}
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {t("redirectUris")}
                    </p>
                    <div className="grid gap-2">
                      {client.redirectUris.map((redirectUri) => (
                        <div
                          key={redirectUri}
                          className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2"
                        >
                          <code className="flex-1 overflow-x-auto font-mono text-xs">
                            {redirectUri}
                          </code>
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
