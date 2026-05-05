import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oauth");
  return { title: t("errorPageTitle") };
}

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, t] = await Promise.all([
    searchParams,
    getTranslations("oauth"),
  ]);

  const message =
    error === "consent_failed" ? t("errorConsentFailed") : t("errorGeneric");

  return (
    <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("errorPageTitle")}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardPanel className="text-center text-muted-foreground text-sm">
          {t("errorPageHint")}
        </CardPanel>
      </Card>
    </main>
  );
}
