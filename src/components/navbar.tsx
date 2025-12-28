"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "./ui/menu";

export default function Navbar() {
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = async (newLocale: string) => {
    try {
      // Set the locale cookie via API
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });

      // Refresh the page to apply the new locale
      router.refresh();
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

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

        {/* Theme Switcher */}
        {mounted && (
          <button
            type="button"
            onClick={() => {
              if (theme === "light") setTheme("dark");
              else if (theme === "dark") setTheme("system");
              else setTheme("light");
            }}
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : theme === "dark"
                  ? "Use system preference"
                  : "Switch to light mode"
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors focus-ring"
          >
            <span aria-hidden="true" className="text-lg">
              {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🖥️"}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
