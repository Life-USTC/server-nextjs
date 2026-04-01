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
      description: tSettings("nav.profile.description"),
      icon: UserRoundCog,
    },
    {
      tab: "accounts",
      title: tSettings("nav.accounts.title"),
      description: tSettings("nav.accounts.description"),
      icon: Link2,
    },
    {
      tab: "content",
      title: tSettings("nav.content.title"),
      description: tSettings("nav.content.description"),
      icon: FileText,
    },
    {
      tab: "danger",
      title: tSettings("nav.danger.title"),
      description: tSettings("nav.danger.description"),
      icon: ShieldAlert,
    },
  ];

  return (
    <nav className="space-y-1.5 rounded-xl border border-border/70 bg-card/72 p-2">
      {items.map((item) => {
        const Icon = item.icon;
        const href = `/settings?tab=${item.tab}`;
        const isActive = currentTab === item.tab;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "block rounded-lg border px-3 py-3 no-underline transition-colors",
              isActive
                ? "border-border/80 bg-background text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/72 hover:text-foreground",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border",
                  isActive
                    ? "border-border/80 bg-background text-primary"
                    : "border-border/60 bg-background/80 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="mt-1 text-muted-foreground text-sm leading-5">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
