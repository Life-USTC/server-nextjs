import { ExternalLink, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";

export async function DashboardLinksPanel({
  links,
  recommendedLinks,
}: {
  links: DashboardLinkSummary[];
  recommendedLinks: DashboardLinkSummary[];
}) {
  const t = await getTranslations("meDashboard");

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle>{t("linkHub.title")}</CardTitle>
      </CardHeader>
      <CardPanel className="space-y-4">
        <div>
          <p className="mb-2 flex items-center gap-2 font-medium text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("linkHub.recommendations")}
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {recommendedLinks.map((link) => (
              <a
                key={`recommended-${link.slug}`}
                href={`/api/dashboard-links/visit?slug=${encodeURIComponent(link.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border p-3 no-underline transition-colors hover:bg-accent"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-sm">{link.title}</p>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {link.description}
                </p>
                <p className="mt-2 text-primary text-xs">
                  {t("linkHub.clickCount", { count: link.clickCount })}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-medium text-sm">{t("linkHub.allLinks")}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {links.map((link) => (
              <a
                key={link.slug}
                href={`/api/dashboard-links/visit?slug=${encodeURIComponent(link.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-3 rounded-md border p-3 no-underline transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{link.title}</p>
                  <p className="line-clamp-2 text-muted-foreground text-xs">
                    {link.description}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {link.clickCount}
                </Badge>
              </a>
            ))}
          </div>
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
          .
        </p>
      </CardPanel>
    </Card>
  );
}
