"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { buildOAuthErrorRedirectUri } from "@/lib/oauth/redirect";

interface OAuthConsentFormProps {
  clientName: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
}

export function OAuthConsentForm({
  clientName,
  clientId,
  redirectUri,
  scopes,
  state,
}: OAuthConsentFormProps) {
  const t = useTranslations("oauth");
  const [loading, setLoading] = useState(false);

  const redirectWithError = ({
    error,
    errorDescription,
  }: {
    error: string;
    errorDescription?: string;
  }) => {
    window.location.href = buildOAuthErrorRedirectUri({
      redirectUri,
      error,
      state,
      errorDescription,
    });
  };

  return (
    <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("authorize")}</CardTitle>
          <CardDescription>
            {t("consentDescription", { app: clientName })}
          </CardDescription>
        </CardHeader>
        <CardPanel className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-2 font-medium text-sm">{t("scopesLabel")}</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
              {scopes.map((scope) => (
                <li key={scope}>{t(`scope_${scope}`, { fallback: scope })}</li>
              ))}
            </ul>
          </div>

          <Form
            action={async () => {
              setLoading(true);

              try {
                const res = await fetch("/api/oauth/authorize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    scope: scopes.join(" "),
                    state,
                  }),
                });

                const data = (await res.json().catch(() => null)) as {
                  redirect?: string;
                  error?: string;
                  error_description?: string;
                } | null;

                if (!res.ok || !data?.redirect) {
                  redirectWithError({
                    error: data?.error ?? "server_error",
                    errorDescription: data?.error_description,
                  });
                  return;
                }

                window.location.href = data.redirect;
              } catch {
                setLoading(false);
                redirectWithError({ error: "server_error" });
                return;
              }
            }}
          >
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  redirectWithError({ error: "access_denied" });
                }}
              >
                {t("deny")}
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? t("authorizing") : t("allow")}
              </Button>
            </div>
          </Form>
        </CardPanel>
      </Card>
    </main>
  );
}
