import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, authApi } from "@/auth";
import { asOAuthProviderApi } from "@/lib/oauth/provider-api";
import { OAuthConsentForm } from "./consent-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oauth");
  return { title: t("authorize") };
}

export const dynamic = "force-dynamic";

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{
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

  if (!params.client_id) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorMissingClientId")}</p>
      </main>
    );
  }

  const client = await asOAuthProviderApi(authApi).getOAuthClientPublic({
    headers: await headers(),
    query: { client_id: params.client_id },
  });
  const requestedScopes = params.scope?.split(" ").filter(Boolean) ?? [];

  return (
    <OAuthConsentForm
      clientName={client.client_name ?? client.client_id}
      oauthQuery={queryString.toString()}
      scopes={requestedScopes}
    />
  );
}
