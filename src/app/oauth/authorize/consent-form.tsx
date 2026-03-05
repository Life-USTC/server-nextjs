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

              if (!res.ok) {
                setLoading(false);
                return;
              }

              const data = await res.json();
              window.location.href = data.redirect;
            }}
          >
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const url = new URL(redirectUri);
                  url.searchParams.set("error", "access_denied");
                  if (state) url.searchParams.set("state", state);
                  window.location.href = url.toString();
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
