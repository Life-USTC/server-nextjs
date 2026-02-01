"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-6xl">404</h1>
        <h2 className="mb-4 font-semibold text-2xl">{t("title")}</h2>
        <p className="mb-4 text-muted-foreground">{t("description")}</p>
        <Button>
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
