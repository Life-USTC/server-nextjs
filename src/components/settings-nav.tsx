"use client";

import { FileText, Link2, ShieldAlert, UserRoundCog } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function SettingsNav() {
  const tSettings = useTranslations("settings");
  const pathname = usePathname();

  const items = [
    {
      href: "/settings/profile",
      title: tSettings("nav.profile.title"),
      description: tSettings("nav.profile.description"),
      icon: UserRoundCog,
    },
    {
      href: "/settings/accounts",
      title: tSettings("nav.accounts.title"),
      description: tSettings("nav.accounts.description"),
      icon: Link2,
    },
    {
      href: "/settings/content",
      title: tSettings("nav.content.title"),
      description: tSettings("nav.content.description"),
      icon: FileText,
    },
    {
      href: "/settings/danger",
      title: tSettings("nav.danger.title"),
      description: tSettings("nav.danger.description"),
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-2 p-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
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
