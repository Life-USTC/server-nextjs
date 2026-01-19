"use client";

import {
  Github,
  Globe,
  Monitor,
  Moon,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "./ui/menu";

export default function BottomBar() {
  const t = useTranslations("profile");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

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
    if (theme === "light") return "Switch to dark mode";
    if (theme === "dark") return "Use system preference";
    return "Switch to light mode";
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
          <a
            href="https://github.com/Life-USTC/server-nextjs"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 w-9 p-0 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors focus-ring"
            aria-label="View source on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>

          {/* User Menu */}
          <Menu>
            <MenuTrigger
              render={
                <button
                  type="button"
                  className="h-9 w-9 p-0 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors focus-ring"
                  aria-label={session ? "User menu" : "Sign in"}
                >
                  {session?.user?.image ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={session.user.image}
                        alt={session.user.name || "User"}
                      />
                      <AvatarFallback>
                        {session.user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <UserIcon className="h-5 w-5" />
                  )}
                </button>
              }
            />
            <MenuPopup>
              {session ? (
                <>
                  <MenuItem className="font-medium" disabled>
                    {session.user?.name || session.user?.email}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={() => router.push("/me")}>
                    {t("title")}
                  </MenuItem>
                  <MenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    {t("signOut")}
                  </MenuItem>
                </>
              ) : (
                <MenuItem onClick={() => signIn()}>
                  {commonT("signIn")}
                </MenuItem>
              )}
            </MenuPopup>
          </Menu>

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
              <MenuRadioGroup
                value={locale}
                onValueChange={handleLanguageChange}
              >
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
              aria-label={getThemeLabel()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors focus-ring"
            >
              {getThemeIcon()}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
