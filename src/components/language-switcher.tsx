"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="px-4 py-2 bg-surface-elevated border border-base rounded-lg hover:bg-surface transition-colors cursor-pointer"
        aria-label="Language selector"
      >
        <option value="en-us">English</option>
        <option value="zh-cn">中文</option>
      </select>
    </div>
  );
}
