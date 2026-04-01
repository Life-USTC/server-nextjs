"use client";

import { Copy, ShieldCheck } from "lucide-react";
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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <Button
          type="button"
          className="min-w-0 flex-1 justify-start overflow-x-auto font-mono text-sm"
          onClick={onCopy}
          disabled={disabled}
          variant="outline"
        >
          {value}
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

  const selectedAuthMethodMeta = AUTH_METHOD_OPTIONS.find(
    (option) => option.value === selectedAuthMethod,
  );
  const authMethodItems = AUTH_METHOD_OPTIONS.map((option) => ({
    label: t(option.labelKey),
    value: option.value,
  }));
  const draftRedirectUris = parseRedirectUris(redirectDraft);
  const publicClientCount = clients.filter(
    (client) =>
      client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
  ).length;
  const dateTimeFormatter = useMemo(
    () =>
      createShanghaiDateTimeFormatter(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
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
      <PageStatGrid>
        <PageStatCard label={t("overviewClients")} value={clients.length} />
        <PageStatCard
          label={t("overviewConfidential")}
          value={confidentialClientCount}
        />
        <PageStatCard label={t("overviewPublic")} value={publicClientCount} />
      </PageStatGrid>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {t("createClientHint")}
          </p>
          <Button type="button" onClick={() => setCreateDialogOpen(true)}>
            {t("createClient")}
          </Button>
        </div>

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

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogPopup className="max-h-[min(90vh,44rem)] max-w-2xl">
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
                <div className="rounded-xl border border-border/80 bg-muted/25 p-4">
                  <p className="font-heading font-semibold text-sm">
                    {t("createFlowTitle")}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                    {t("createFlowIntro")}
                  </p>
                  <ol className="mt-4 space-y-3">
                    <li className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary text-xs">
                        1
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-medium text-sm">
                          {t("guideSecretTitle")}
                        </p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {t("guideSecretDescription")}
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary text-xs">
                        2
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-medium text-sm">
                          {t("guideRedirectTitle")}
                        </p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {t("guideRedirectDescription")}
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary text-xs">
                        3
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-medium text-sm">
                          {t("guidePermissionsTitle")}
                        </p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {t("guidePermissionsDescription")}
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>

                <Alert variant="info">
                  <ShieldCheck className="mt-0.5 size-4" />
                  <AlertTitle>{t("panelSecurityTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("panelSecurityDescription")}
                  </AlertDescription>
                </Alert>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field className="sm:col-span-2">
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

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="oauth-token-endpoint-auth-method">
                      {t("clientType")}
                    </FieldLabel>
                    <Select
                      id="oauth-token-endpoint-auth-method"
                      items={authMethodItems}
                      name="tokenEndpointAuthMethod"
                      value={selectedAuthMethod}
                      onValueChange={(value) =>
                        setSelectedAuthMethod(value ?? DEFAULT_AUTH_METHOD)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {authMethodItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    <FieldDescription>
                      {selectedAuthMethodMeta
                        ? t(selectedAuthMethodMeta.descriptionKey)
                        : t("clientTypeHint")}
                    </FieldDescription>
                  </Field>

                  <Field className="sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FieldLabel htmlFor="oauth-redirect-uris">
                        {t("redirectUris")}
                      </FieldLabel>
                      <span className="text-muted-foreground text-xs">
                        {t("previewRedirectCount", {
                          count: draftRedirectUris.length,
                        })}
                      </span>
                    </div>
                    <Textarea
                      id="oauth-redirect-uris"
                      name="redirectUris"
                      className="min-h-28 font-mono text-sm"
                      placeholder={t("redirectUrisPlaceholder")}
                      value={redirectDraft}
                      onChange={(event) => setRedirectDraft(event.target.value)}
                      required
                    />
                    <FieldDescription>{t("redirectUrisHint")}</FieldDescription>
                  </Field>

                  <Field className="sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FieldLabel>{t("permissionsTitle")}</FieldLabel>
                      <span className="text-muted-foreground text-xs">
                        {t("previewScopeCount", {
                          count: selectedScopes.length,
                        })}
                      </span>
                    </div>
                    <FieldDescription>{t("permissionsHint")}</FieldDescription>

                    <div className="grid gap-3 sm:grid-cols-3">
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
              </DialogPanel>
            </form>
          </DialogPopup>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("existingClients")}</CardTitle>
          <CardDescription>{t("existingClientsDescription")}</CardDescription>
        </CardHeader>
        <CardPanel className="p-0">
          {clients.length === 0 ? (
            <p className="px-6 py-8 text-muted-foreground text-sm">
              {t("noClients")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[8rem]">
                      {t("clientName")}
                    </TableHead>
                    <TableHead className="min-w-[12rem]">
                      {t("clientIdLabel")}
                    </TableHead>
                    <TableHead className="min-w-[7rem]">
                      {t("clientType")}
                    </TableHead>
                    <TableHead className="min-w-[10rem]">
                      {t("tableColumnScopes")}
                    </TableHead>
                    <TableHead className="min-w-[9rem]">
                      {t("tableColumnRedirects")}
                    </TableHead>
                    <TableHead className="min-w-[9rem] whitespace-nowrap">
                      {t("createdAtLabel")}
                    </TableHead>
                    <TableHead className="w-[5rem] text-end">
                      {t("tableColumnActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const redirectTitle = client.redirectUris.join("\n");
                    const firstRedirect = client.redirectUris[0];

                    return (
                      <TableRow key={client.clientId}>
                        <TableCell className="align-top font-medium">
                          {client.name.trim().length > 0 ? (
                            client.name
                          ) : (
                            <span className="text-muted-foreground italic">
                              {t("unnamedClient")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex max-w-[min(28rem,55vw)] items-center gap-1">
                            <code className="min-w-0 flex-1 truncate font-mono text-xs">
                              {client.clientId}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0"
                              aria-label={t("copyClientId")}
                              onClick={() =>
                                copyValue(client.clientId, t("clientIdCopied"))
                              }
                            >
                              <Copy className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
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
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {client.scopes.map((scope) => (
                              <Badge key={scope} variant="outline">
                                {t(`scope_${scope}`, { fallback: scope })}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          {client.redirectUris.length === 0 ? (
                            "—"
                          ) : (
                            <>
                              <p
                                className="max-w-[min(20rem,40vw)] truncate font-mono text-xs"
                                title={redirectTitle}
                              >
                                {firstRedirect}
                              </p>
                              {client.redirectUris.length > 1 ? (
                                <p className="mt-0.5 text-muted-foreground text-xs">
                                  {t("previewRedirectCount", {
                                    count: client.redirectUris.length,
                                  })}
                                </p>
                              ) : null}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-top text-muted-foreground text-xs">
                          {dateTimeFormatter.format(new Date(client.createdAt))}
                        </TableCell>
                        <TableCell className="text-end align-top">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteClient(client.clientId)}
                          >
                            {t("deleteClient")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
