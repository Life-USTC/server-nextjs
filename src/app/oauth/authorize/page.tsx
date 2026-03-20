import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { buildOAuthErrorRedirectUri } from "@/lib/oauth/redirect";
import {
  OAUTH_CODE_CHALLENGE_METHOD_S256,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";
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

  if (!session?.user?.id) {
    const qs = new URLSearchParams(
      Object.entries(await searchParams).filter(
        (e): e is [string, string] => e[1] !== undefined,
      ),
    );
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/oauth/authorize?${qs.toString()}`)}`,
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

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: params.client_id },
    select: {
      clientId: true,
      name: true,
      redirectUris: true,
      scopes: true,
      tokenEndpointAuthMethod: true,
    },
  });

  if (!client) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorInvalidClient")}</p>
      </main>
    );
  }

  if (
    params.redirect_uri &&
    !client.redirectUris.includes(params.redirect_uri)
  ) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorInvalidRedirectUri")}</p>
      </main>
    );
  }

  const requestedScopes = params.scope?.split(" ").filter(Boolean) ?? [
    "openid",
    "profile",
  ];

  // Per OAuth 2.0 spec, if multiple redirect URIs are registered the client
  // must explicitly specify which one to use.
  const redirectUri =
    params.redirect_uri ??
    (client.redirectUris.length === 1 ? client.redirectUris[0] : null);

  if (params.response_type !== "code" && redirectUri) {
    redirect(
      buildOAuthErrorRedirectUri({
        redirectUri,
        error: "unsupported_response_type",
        state: params.state,
      }),
    );
  }

  if (!redirectUri) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorMissingRedirectUri")}</p>
      </main>
    );
  }

  const requiresPkce =
    client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD;
  if (
    requiresPkce &&
    (!params.code_challenge ||
      params.code_challenge_method !== OAUTH_CODE_CHALLENGE_METHOD_S256)
  ) {
    redirect(
      buildOAuthErrorRedirectUri({
        redirectUri,
        error: "invalid_request",
        state: params.state,
        errorDescription:
          "Public clients must use PKCE with code_challenge_method=S256",
      }),
    );
  }

  return (
    <OAuthConsentForm
      clientName={client.name}
      clientId={client.clientId}
      redirectUri={redirectUri}
      scopes={requestedScopes}
      state={params.state}
      codeChallenge={params.code_challenge}
      codeChallengeMethod={params.code_challenge_method}
      resource={params.resource}
    />
  );
}
