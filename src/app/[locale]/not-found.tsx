"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">{t("title")}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t("description")}
        </p>
        <Button>
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
