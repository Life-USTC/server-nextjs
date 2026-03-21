"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createOAuthClient, deleteOAuthClient } from "@/app/actions/oauth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface OAuthClientInfo {
  id: string;
  clientId: string;
  name: string;
  tokenEndpointAuthMethod: string;
  redirectUris: string[];
  scopes: string[];
  createdAt: string;
}

export function OAuthClientManager({
  clients,
}: {
  clients: OAuthClientInfo[];
}) {
  const t = useTranslations("oauth");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    clientSecret: string | null;
  } | null>(null);

  async function onCreateClient(formData: FormData) {
    setLoading(true);
    const result = await createOAuthClient(formData);
    setLoading(false);

    if ("error" in result) {
      toast({
        title: t("createError"),
        description: result.error,
        variant: "destructive",
      });
    } else if (result.clientId) {
      setCreatedCredentials({
        clientId: result.clientId,
        clientSecret:
          typeof result.clientSecret === "string" ? result.clientSecret : null,
      });
      toast({
        title: t("createSuccess"),
        description: t("createSuccessDescription"),
        variant: "success",
      });
    }
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

  return (
    <div className="space-y-6">
      {/* Create new client */}
      <Card>
        <CardHeader>
          <CardTitle>{t("createClient")}</CardTitle>
          <CardDescription>{t("createClientDescription")}</CardDescription>
        </CardHeader>
        <Form action={onCreateClient}>
          <CardPanel className="space-y-4">
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
              <FieldLabel htmlFor="redirectUris">
                {t("redirectUris")}
              </FieldLabel>
              <textarea
                id="redirectUris"
                name="redirectUris"
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                placeholder={t("redirectUrisPlaceholder")}
                required
              />
              <p className="mt-1 text-muted-foreground text-xs">
                {t("redirectUrisHint")}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="tokenEndpointAuthMethod">
                {t("clientType")}
              </FieldLabel>
              <select
                id="tokenEndpointAuthMethod"
                name="tokenEndpointAuthMethod"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue="client_secret_basic"
              >
                <option value="client_secret_basic">
                  {t("clientTypeConfidential")}
                </option>
                <option value="none">{t("clientTypePublic")}</option>
              </select>
              <p className="mt-1 text-muted-foreground text-xs">
                {t("clientTypeHint")}
              </p>
            </Field>
            <Field className="flex items-center gap-2">
              <input
                id="enableMcp"
                name="enableMcp"
                type="checkbox"
                defaultChecked
              />
              <FieldLabel htmlFor="enableMcp" className="font-normal">
                {t("enableMcpScope")}
              </FieldLabel>
            </Field>
            <Button type="submit" disabled={loading}>
              {loading ? t("creating") : t("createClient")}
            </Button>
          </CardPanel>
        </Form>
      </Card>

      {/* Show credentials after creation */}
      {createdCredentials && (
        <Card className="border-success">
          <CardHeader>
            <CardTitle>{t("credentialsTitle")}</CardTitle>
            <CardDescription>{t("credentialsWarning")}</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-3">
            <Field>
              <FieldLabel>{t("clientIdLabel")}</FieldLabel>
              <code className="block rounded bg-muted p-2 font-mono text-sm">
                {createdCredentials.clientId}
              </code>
            </Field>
            <Field>
              <FieldLabel>{t("clientSecretLabel")}</FieldLabel>
              <code className="block rounded bg-muted p-2 font-mono text-sm">
                {createdCredentials.clientSecret ?? t("publicClientNoSecret")}
              </code>
            </Field>
            <Button
              variant="outline"
              onClick={() => setCreatedCredentials(null)}
            >
              {t("dismissCredentials")}
            </Button>
          </CardPanel>
        </Card>
      )}

      {/* Existing clients list */}
      <Card>
        <CardHeader>
          <CardTitle>{t("existingClients")}</CardTitle>
        </CardHeader>
        <CardPanel>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noClients")}</p>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{client.name}</p>
                    <p className="font-mono text-muted-foreground text-xs">
                      {t("clientIdLabel")}: {client.clientId}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("clientType")}:{" "}
                      {client.tokenEndpointAuthMethod === "none"
                        ? t("clientTypePublic")
                        : t("clientTypeConfidential")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("redirectUris")}: {client.redirectUris.join(", ")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("scopesLabel")}: {client.scopes.join(", ")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteClient(client.id)}
                  >
                    {t("deleteClient")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
