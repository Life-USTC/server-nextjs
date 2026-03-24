import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.signIn"),
  };
}

async function signInWithProvider(formData: FormData) {
  "use server";

  const providerId = String(formData.get("providerId") ?? "");
  const redirectTo = String(formData.get("callbackUrl") ?? "/");

  await signIn(providerId, { redirectTo });
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (session?.user) {
    redirect(params.callbackUrl || "/");
  }

  const t = await getTranslations("signIn");
  const showDebugProviders =
    process.env.NODE_ENV === "development" ||
    process.env.E2E_DEBUG_AUTH === "1";
  const providers = [
    { id: "oidc", name: "USTC" },
    { id: "github", name: "GitHub" },
    { id: "google", name: "Google" },
    ...(showDebugProviders
      ? [
          { id: "dev-debug", name: t("devDebugProvider") },
          { id: "dev-admin", name: t("devAdminProvider") },
        ]
      : []),
  ];

  return (
    <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardPanel className="space-y-4">
          {params.error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
              {params.error === "OAuthAccountNotLinked"
                ? t("errorAccountNotLinked")
                : t("errorGeneric")}
            </div>
          ) : null}

          {providers.map((provider) => (
            <form
              key={provider.id}
              action={signInWithProvider}
              className="flex w-full flex-col gap-4"
            >
              <input type="hidden" name="providerId" value={provider.id} />
              <input
                type="hidden"
                name="callbackUrl"
                value={params.callbackUrl || "/"}
              />
              <Button
                type="submit"
                variant="outline"
                className="h-11 w-full justify-center"
              >
                {t("signInWith", { provider: provider.name })}
              </Button>
            </form>
          ))}

          {showDebugProviders ? (
            <p className="text-center text-muted-foreground text-xs">
              {t("devDebugHint")}
            </p>
          ) : null}

          <p className="pt-2 text-center text-muted-foreground text-xs">
            {t("termsNotice")}
          </p>
        </CardPanel>
      </Card>
    </main>
  );
}
