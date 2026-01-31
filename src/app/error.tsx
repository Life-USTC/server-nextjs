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
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">{t("somethingWentWrong")}</h2>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <div className="flex gap-4 justify-center">
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
