"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFoundContent() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-6xl">404</h1>
        <h2 className="mb-4 font-semibold text-2xl">{t("title")}</h2>
        <p className="mb-8 text-muted-foreground">{t("description")}</p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-on-primary transition-colors hover:bg-primary-hover"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
