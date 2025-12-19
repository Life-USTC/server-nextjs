"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">{t("title")}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t("description")}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
