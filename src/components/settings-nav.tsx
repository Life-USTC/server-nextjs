"use client";

import { FileText, Link2, ShieldAlert, UserRoundCog } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/shared/lib/utils";

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
    <div className="space-y-2 p-2">
      {items.map((item) => {
        const Icon = item.icon;
        const href = `/settings?tab=${item.tab}`;
        const isActive = currentTab === item.tab;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 no-underline transition-colors",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-muted-foreground text-xs">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
