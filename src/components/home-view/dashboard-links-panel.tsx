import {
  BookOpen,
  Building,
  ClipboardList,
  GraduationCap,
  Mail,
  MonitorPlay,
  Network,
  Pin,
  School,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import type { DashboardLinkIcon } from "@/lib/dashboard-links";

type PanelVariant = "overview" | "all";

const ICON_MAP: Record<DashboardLinkIcon, typeof BookOpen> = {
  "book-open": BookOpen,
  building: Building,
  "clipboard-list": ClipboardList,
  "graduation-cap": GraduationCap,
  mail: Mail,
  "monitor-play": MonitorPlay,
  network: Network,
  school: School,
  users: Users,
};

export async function DashboardLinksPanel({
  links,
  variant,
}: {
  links: DashboardLinkSummary[];
  variant: PanelVariant;
}) {
  const t = await getTranslations("meDashboard");
  const isAllTab = variant === "all";
  const returnTo = isAllTab ? "/?tab=links" : "/";

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle>
          {isAllTab ? t("linkHub.allSitesTab") : t("linkHub.title")}
        </CardTitle>
      </CardHeader>
      <CardPanel className="space-y-4">
        {!isAllTab && (
          <p className="text-muted-foreground text-sm">
            {t("linkHub.overviewHint")}
          </p>
        )}

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const Icon = ICON_MAP[link.icon];
            return (
              <div key={link.slug} className="border">
                <a
                  href={`/api/dashboard-links/visit?slug=${encodeURIComponent(link.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full p-3 no-underline transition-colors hover:bg-accent"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="truncate font-medium text-sm">{link.title}</p>
                    {link.isPinned && (
                      <Pin className="ml-auto h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-muted-foreground text-xs">
                    {link.description}
                  </p>
                </a>
                <form
                  action="/api/dashboard-links/pin"
                  method="post"
                  className="border-t"
                >
                  <input type="hidden" name="slug" value={link.slug} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    type="hidden"
                    name="action"
                    value={link.isPinned ? "unpin" : "pin"}
                  />
                  <button
                    type="submit"
                    className="w-full px-3 py-2 text-left text-muted-foreground text-xs transition-colors hover:bg-accent"
                  >
                    {link.isPinned ? t("linkHub.unpin") : t("linkHub.pin")}
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <p className="text-muted-foreground text-xs">
          {t("linkHub.credit")}
          <a
            href="https://github.com/SmartHypercube/ustclife"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            SmartHypercube/ustclife
          </a>
          。
        </p>
      </CardPanel>
    </Card>
  );
}
