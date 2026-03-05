import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { OAuthConsentForm } from "@/components/oauth-consent-form";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oauth");
  return { title: t("authorize.title") };
}

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
  }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  } = params;

  // Validate required parameters
  if (!client_id || !redirect_uri || response_type !== "code") {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-semibold text-2xl">Invalid Request</h1>
          <p className="text-muted-foreground">
            Missing or invalid OAuth parameters.
          </p>
        </div>
      </main>
    );
  }

  // Lookup the OAuth client
  const oauthClient = await prisma.oAuthClient.findUnique({
    where: { clientId: client_id },
    select: {
      id: true,
      name: true,
      description: true,
      clientId: true,
      redirectUris: true,
      scopes: true,
      isActive: true,
    },
  });

  if (!oauthClient || !oauthClient.isActive) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-semibold text-2xl">Unknown Client</h1>
          <p className="text-muted-foreground">
            The application requesting authorization is not registered.
          </p>
        </div>
      </main>
    );
  }

  // Validate redirect_uri
  if (!oauthClient.redirectUris.includes(redirect_uri)) {
    return (
      <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-semibold text-2xl">Invalid Redirect URI</h1>
          <p className="text-muted-foreground">
            The redirect URI is not registered for this application.
          </p>
        </div>
      </main>
    );
  }

  // Require sign in
  if (!session?.user?.id) {
    const callbackPath = `/oauth/authorize?${new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined) as [
          string,
          string,
        ][],
      ),
    ).toString()}`;
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  // Parse requested scopes (filter to only allowed scopes)
  const requestedScopes = (scope ?? "profile")
    .split(" ")
    .filter((s) => oauthClient.scopes.includes(s));

  if (requestedScopes.length === 0) {
    requestedScopes.push("profile");
  }

  return (
    <OAuthConsentForm
      client={{
        clientId: oauthClient.clientId,
        name: oauthClient.name,
        description: oauthClient.description,
      }}
      redirectUri={redirect_uri}
      scopes={requestedScopes}
      state={state}
      codeChallenge={code_challenge}
      codeChallengeMethod={code_challenge_method}
    />
  );
}
