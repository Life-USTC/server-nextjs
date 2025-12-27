"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { usePathname, useRouter } from "@/i18n/routing";

export default function Navbar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[var(--layout-content-width)] items-center justify-end gap-3 px-4">
        {/* Language Switcher */}
        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                className="h-9 w-9 p-0 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors focus-ring"
                aria-label="Language selector"
              >
                <Globe className="h-5 w-5" />
              </button>
            }
          />
          <MenuPopup>
            <MenuRadioGroup value={locale} onValueChange={handleLanguageChange}>
              <MenuRadioItem value="en-us">English</MenuRadioItem>
              <MenuRadioItem value="zh-cn">中文</MenuRadioItem>
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>

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
