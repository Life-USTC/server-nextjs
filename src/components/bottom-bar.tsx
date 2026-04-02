"use client";

import { Globe, Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isAppLocale } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { apiClient } from "@/lib/api/client";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "./ui/menu";

export default function BottomBar() {
  const _commonT = useTranslations("common");
  const homepageActionsT = useTranslations("homepage.actions");
  const langT = useTranslations("language");
  const themeT = useTranslations("theme");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = async (newLocale: string) => {
    if (!isAppLocale(newLocale)) {
      return;
    }
    try {
      // Set the locale cookie via API
      const { response } = await apiClient.POST("/api/locale", {
        body: { locale: newLocale },
      });
      if (!response.ok) {
        throw new Error("Failed to change language");
      }

      // Reload so cookie-backed locale updates apply consistently in production.
      window.location.reload();
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
    <nav className="mt-8 border-border border-t bg-background pb-[env(safe-area-inset-bottom,0px)] md:mt-12">
      <div className="page-main flex min-h-16 flex-col items-start gap-4 py-4 md:gap-5 md:py-5">
        <div className="flex min-w-0 flex-col items-start gap-2 pt-0.5 md:gap-2.5">
          <Link
            href="/terms"
            className="block w-fit text-muted-foreground text-sm/6 no-underline transition-colors hover:text-foreground"
          >
            {_commonT("terms")}
          </Link>
          <Link
            href="/privacy"
            className="block w-fit text-muted-foreground text-sm/6 no-underline transition-colors hover:text-foreground"
          >
            {_commonT("privacy")}
          </Link>
          <Link
            href="https://github.com/Life-USTC/server-nextjs"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-fit text-muted-foreground text-sm/6 no-underline transition-colors hover:text-foreground"
          >
            GitHub
          </Link>
          <Link
            href="/mobile-app"
            className="block w-fit text-muted-foreground text-sm/6 no-underline transition-colors hover:text-foreground"
          >
            {homepageActionsT("mobileApp")}
          </Link>
        </div>

        <div className="flex items-center gap-3 pt-0.5">
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
