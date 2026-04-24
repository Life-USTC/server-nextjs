"use client";

import { Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  type CreatedCredentials,
  getClientPatternDescriptionKey,
  getClientTypeBadgeVariant,
  getClientTypeLabel,
  type OAuthClientInfo,
  type OAuthTranslator,
} from "./oauth-client-manager-shared";

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
  t: OAuthTranslator;
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
  t: OAuthTranslator;
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

export function CreatedCredentialsCard({
  createdCredentials,
  copyValue,
  onDismiss,
  t,
}: {
  createdCredentials: CreatedCredentials;
  copyValue: (value: string, description: string) => Promise<void>;
  onDismiss: () => void;
  t: OAuthTranslator;
}) {
  return (
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
            {getClientTypeLabel(t, createdCredentials.tokenEndpointAuthMethod)}
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
            value={createdCredentials.clientSecret ?? t("publicClientNoSecret")}
            copyLabel={t("copyClientSecret")}
            disabled={!createdCredentials.clientSecret}
            onCopy={() => {
              if (!createdCredentials.clientSecret) return;
              void copyValue(
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
          <Button type="button" variant="ghost" onClick={onDismiss}>
            {t("dismissCredentials")}
          </Button>
        </div>
      </CardPanel>
    </Card>
  );
}

export function OAuthClientList({
  clients,
  trustedClients,
  externalClients,
  copyValue,
  dateTimeFormatter,
  onDeleteClient,
  t,
}: {
  clients: OAuthClientInfo[];
  trustedClients: OAuthClientInfo[];
  externalClients: OAuthClientInfo[];
  copyValue: (value: string, description: string) => Promise<void>;
  dateTimeFormatter: Intl.DateTimeFormat;
  onDeleteClient: (clientId: string) => Promise<void>;
  t: OAuthTranslator;
}) {
  if (clients.length === 0) {
    return (
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
    );
  }

  return (
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
  );
}
