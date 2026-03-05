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
  client: {
    clientId: string;
    name: string;
    description: string | null;
  };
  redirectUri: string;
  scopes: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

const SCOPE_LABELS: Record<string, { key: string }> = {
  profile: { key: "scopeProfile" },
};

export function OAuthConsentForm({
  client,
  redirectUri,
  scopes,
  state,
  codeChallenge,
  codeChallengeMethod,
}: OAuthConsentFormProps) {
  const t = useTranslations("oauth.authorize");
  const [loading, setLoading] = useState(false);
  const [denying, setDenying] = useState(false);

  async function handleApprove(_formData: FormData) {
    setLoading(true);
    const res = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.clientId,
        redirectUri,
        scopes,
        state,
        codeChallenge,
        codeChallengeMethod,
        approved: true,
      }),
    });

    if (res.ok) {
      const { redirectTo } = await res.json();
      window.location.href = redirectTo;
    } else {
      setLoading(false);
    }
  }

  function handleDeny() {
    setDenying(true);
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    if (state) {
      url.searchParams.set("state", state);
    }
    window.location.href = url.toString();
  }

  return (
    <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {t("requestingAccess", { app: client.name })}
          </CardDescription>
          {client.description && (
            <p className="mt-1 text-muted-foreground text-xs">
              {client.description}
            </p>
          )}
        </CardHeader>
        <CardPanel className="space-y-5">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="mb-2 font-medium text-sm">{t("permissionsLabel")}</p>
            <ul className="space-y-1">
              {scopes.map((scope) => (
                <li key={scope} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-green-600">✓</span>
                  <span>
                    {SCOPE_LABELS[scope]
                      ? t(SCOPE_LABELS[scope].key as Parameters<typeof t>[0])
                      : scope}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Form action={handleApprove}>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || denying}
            >
              {loading ? t("authorizing") : t("approve")}
            </Button>
          </Form>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDeny}
            disabled={loading || denying}
          >
            {denying ? t("denying") : t("deny")}
          </Button>
        </CardPanel>
      </Card>
    </main>
  );
}
