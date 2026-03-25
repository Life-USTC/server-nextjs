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
  consentCode: string;
  state?: string | null;
  scopes: string[];
}

export function OAuthConsentForm({
  clientName,
  consentCode,
  state,
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
          consent_code: consentCode,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        redirectURI?: string;
      } | null;

      const redirectURI = payload?.redirectURI;
      if (!response.ok || !redirectURI) {
        window.location.href = "/error?error=consent_failed";
        return;
      }

      if (!accept && state) {
        const redirectUrl = new URL(redirectURI);
        if (!redirectUrl.searchParams.has("state")) {
          redirectUrl.searchParams.set("state", state);
        }
        window.location.href = redirectUrl.toString();
        return;
      }

      window.location.href = redirectURI;
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
