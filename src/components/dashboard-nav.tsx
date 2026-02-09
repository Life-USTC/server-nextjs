"use client";

import { BookOpenCheck, CalendarDays, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type DashboardNavItem = {
  href: string;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
  isActive: (pathname: string) => boolean;
};

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations("meDashboard.nav");

  const items: DashboardNavItem[] = [
    {
      href: "/dashboard",
      title: t("overview.title"),
      description: t("overview.description"),
      icon: LayoutDashboard,
      isActive: (path) => path === "/dashboard",
    },
    {
      href: "/dashboard/subscriptions/sections",
      title: t("subscriptions.title"),
      description: t("subscriptions.description"),
      icon: CalendarDays,
      isActive: (path) => path.startsWith("/dashboard/subscriptions"),
    },
    {
      href: "/dashboard/homeworks",
      title: t("homeworks.title"),
      description: t("homeworks.description"),
      icon: BookOpenCheck,
      isActive: (path) => path.startsWith("/dashboard/homeworks"),
    },
  ];

  return (
    <nav className="space-y-2 p-2" aria-label={t("ariaLabel")}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.isActive(pathname);

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
    </nav>
  );
}
