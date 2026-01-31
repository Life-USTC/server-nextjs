"use client";

import { Github, Globe, Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "./ui/menu";

export default function BottomBar() {
  const _commonT = useTranslations("common");
  const langT = useTranslations("language");
  const themeT = useTranslations("theme");
  const a11yT = useTranslations("accessibility");
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

  const getThemeIcon = () => {
    if (!mounted) return <Monitor className="h-5 w-5" />;
    if (theme === "light") return <Sun className="h-5 w-5" />;
    if (theme === "dark") return <Moon className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const getThemeLabel = () => {
    if (theme === "light") return themeT("switchToDark");
    if (theme === "dark") return themeT("useSystem");
    return themeT("switchToLight");
  };

  return (
    <nav className="border-t border-border bg-background">
      <div className="mx-auto flex h-14 max-w-(--layout-content-width) items-center justify-between gap-3 px-4">
        {/* Left: Life@USTC Branding */}
        <Link
          href="/"
          className="text-body font-medium text-foreground hover:text-primary transition-colors no-underline"
        >
          Life@USTC
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* GitHub Link */}
          <Button
            aria-label={a11yT("viewSourceOnGithub")}
            className="h-9 w-9"
            size="icon"
            variant="outline"
            render={
              <Link
                href="https://github.com/Life-USTC/server-nextjs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={a11yT("viewSourceOnGithub")}
              />
            }
          >
            <Github className="h-5 w-5" />
          </Button>

          {/* Language Switcher */}
          <Menu>
            <MenuTrigger
              render={
                <Button
                  aria-label={langT("selector")}
                  className="h-9 w-9"
                  size="icon"
                  variant="outline"
                >
                  <Globe className="h-5 w-5" />
                </Button>
              }
            />
            <MenuPopup>
              <MenuRadioGroup
                value={locale}
                onValueChange={handleLanguageChange}
              >
                <MenuRadioItem value="en-us">{langT("english")}</MenuRadioItem>
                <MenuRadioItem value="zh-cn">{langT("chinese")}</MenuRadioItem>
              </MenuRadioGroup>
            </MenuPopup>
          </Menu>

          {/* Theme Switcher */}
          {mounted && (
            <Button
              aria-label={getThemeLabel()}
              className="h-9 w-9"
              onClick={() => {
                if (theme === "light") setTheme("dark");
                else if (theme === "dark") setTheme("system");
                else setTheme("light");
              }}
              size="icon"
              variant="outline"
            >
              {getThemeIcon()}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
