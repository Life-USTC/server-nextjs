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
  oauthQuery: string;
  scopes: string[];
}

export function OAuthConsentForm({
  clientName,
  oauthQuery,
  scopes,
}: OAuthConsentFormProps) {
  const t = useTranslations("oauth");
  const [loading, setLoading] = useState(false);

  const submitConsent = async (accept: boolean) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accept,
          oauth_query: oauthQuery,
          scope: scopes.join(" "),
        }),
      });
      let payload: { url?: string } | null = null;
      try {
        payload = await response.json();
      } catch {
        // Malformed JSON response — handled below via redirect
      }

      const redirectUrl = payload?.url;
      if (!response.ok || !redirectUrl) {
        window.location.href = "/error?error=consent_failed";
        return;
      }

      window.location.href = redirectUrl;
    } catch {
      window.location.href = "/error?error=consent_failed";
    }
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
              await submitConsent(true);
            }}
          >
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={async () => {
                  await submitConsent(false);
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
