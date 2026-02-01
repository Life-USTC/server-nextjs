"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = useTranslations("common");

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-4 font-bold text-2xl">{t("somethingWentWrong")}</h2>
        <p className="mb-6 text-muted-foreground">{error.message}</p>
        <div className="flex justify-center gap-4">
          <Button onClick={reset} variant="default">
            {t("tryAgain")}
          </Button>
          <Button
            render={<Link className="no-underline" href="/" />}
            variant="outline"
          >
            {t("backToHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
