"use client";

import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/routing";

export default function Navbar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { theme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLocale: string | null) => {
    if (!newLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  const getLanguageLabel = (locale: string) => {
    return locale === "en-us" ? "English" : "中文";
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[var(--layout-content-width)] items-center justify-end gap-3 px-4">
        {/* Language Switcher */}
        <Select
          value={locale}
          onValueChange={handleLanguageChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-28" aria-label="Language selector">
            <SelectValue>{getLanguageLabel(locale)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-us">English</SelectItem>
            <SelectItem value="zh-cn">中文</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme Toggle */}
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors focus-ring"
          >
            <span aria-hidden="true" className="text-lg">
              {isDark ? "🌙" : "☀️"}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
