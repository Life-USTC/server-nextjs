import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
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

  if (params.response_type !== "code") {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorUnsupportedResponseType")}</p>
      </main>
    );
  }

  if (!params.client_id) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">{t("errorMissingClientId")}</p>
      </main>
    );
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: params.client_id },
    select: { clientId: true, name: true, redirectUris: true, scopes: true },
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

  return (
    <OAuthConsentForm
      clientName={client.name}
      clientId={client.clientId}
      redirectUri={params.redirect_uri || client.redirectUris[0]}
      scopes={requestedScopes}
      state={params.state}
    />
  );
}
