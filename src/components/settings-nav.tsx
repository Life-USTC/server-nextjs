"use client";

import { FileText, Link2, ShieldAlert, UserRoundCog } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function SettingsNav() {
  const tSettings = useTranslations("settings");
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "profile";

  const items = [
    {
      tab: "profile",
      title: tSettings("nav.profile.title"),
      icon: UserRoundCog,
    },
    {
      tab: "accounts",
      title: tSettings("nav.accounts.title"),
      icon: Link2,
    },
    {
      tab: "content",
      title: tSettings("nav.content.title"),
      icon: FileText,
    },
    {
      tab: "danger",
      title: tSettings("nav.danger.title"),
      icon: ShieldAlert,
    },
  ];

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label={tSettings("title")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const href = `/settings?tab=${item.tab}`;
        const isActive = currentTab === item.tab;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-medium text-sm no-underline transition-colors",
              isActive
                ? "border-border/80 bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/70 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
