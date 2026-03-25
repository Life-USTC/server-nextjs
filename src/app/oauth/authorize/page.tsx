import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { resolveOAuthClient } from "@/lib/oauth/client-resolver";
import { OAuthConsentForm } from "./consent-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oauth");
  return { title: t("authorize") };
}

export const dynamic = "force-dynamic";

async function resolveConsentState(
  consentCode: string,
): Promise<string | null> {
  const verification = await prisma.verificationToken.findFirst({
    where: { identifier: consentCode },
    select: { token: true },
  });
  if (!verification?.token) {
    return null;
  }

  try {
    const parsed = JSON.parse(verification.token) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "state" in parsed &&
      typeof parsed.state === "string"
    ) {
      return parsed.state;
    }
  } catch {
    return null;
  }

  return null;
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{
    consent_code?: string;
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    resource?: string;
  }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  const queryString = new URLSearchParams(entries);

  if (!session?.user?.id) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/oauth/authorize?${queryString.toString()}`)}`,
    );
  }

  const t = await getTranslations("oauth");

  if (!params.consent_code) {
    if (!params.client_id) {
      return (
        <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
          <p className="text-destructive">{t("errorMissingClientId")}</p>
        </main>
      );
    }

    const resolvedClient = await resolveOAuthClient(params.client_id);
    if ("error" in resolvedClient) {
      return (
        <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
          <p className="text-destructive">{t("errorInvalidClient")}</p>
        </main>
      );
    }
    if (
      params.redirect_uri &&
      !resolvedClient.client.redirectUris.includes(params.redirect_uri)
    ) {
      return (
        <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
          <p className="text-destructive">{t("errorInvalidRedirectUri")}</p>
        </main>
      );
    }

    if (!params.response_type) {
      queryString.set("response_type", "code");
    }
    queryString.set("prompt", "consent");
    redirect(`/api/oauth/authorize?${queryString.toString()}`);
  }

  if (!params.client_id) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorMissingClientId")}</p>
      </main>
    );
  }

  const resolvedClient = await resolveOAuthClient(params.client_id);

  if ("error" in resolvedClient) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorInvalidClient")}</p>
      </main>
    );
  }
  const client = resolvedClient.client;
  const requestedScopes = params.scope?.split(" ").filter(Boolean) ?? [];
  const consentState = params.consent_code
    ? await resolveConsentState(params.consent_code)
    : null;

  return (
    <OAuthConsentForm
      clientName={client.name}
      consentCode={params.consent_code}
      state={consentState}
      scopes={requestedScopes}
    />
  );
}
