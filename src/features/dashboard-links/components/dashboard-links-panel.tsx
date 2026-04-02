import { getTranslations } from "next-intl/server";
import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import {
  DASHBOARD_LINK_GROUP_ORDER,
  type DashboardLinkGroup,
} from "../lib/dashboard-links";
import { DashboardLinksWithSearch } from "./dashboard-links-with-search";

type PanelVariant = "overview" | "all";

const GROUP_LABEL_KEY: Record<DashboardLinkGroup, string> = {
  mostClicked: "linkHub.groups.mostClicked",
  study: "linkHub.groups.study",
  life: "linkHub.groups.life",
  tech: "linkHub.groups.tech",
  classroom: "linkHub.groups.classroom",
  external: "linkHub.groups.external",
  graduate: "linkHub.groups.graduate",
  leastClicked: "linkHub.groups.leastClicked",
};

export async function DashboardLinksPanel({
  links,
  variant,
  allowPinning = true,
}: {
  links: DashboardLinkSummary[];
  variant: PanelVariant;
  allowPinning?: boolean;
}) {
  const t = await getTranslations("meDashboard");
  const isAllTab = variant === "all";
  const returnTo = isAllTab ? "/?tab=links" : "/";
  const groupedLinks = isAllTab
    ? DASHBOARD_LINK_GROUP_ORDER.map((group) => ({
        group,
        label: t(GROUP_LABEL_KEY[group]),
        links: links.filter((link) => link.group === group),
      })).filter((entry) => entry.links.length > 0)
    : [
        {
          group: "mostClicked" as const,
          label: "",
          links,
        },
      ];

  return (
    <DashboardLinksWithSearch
      groupedLinks={groupedLinks}
      returnTo={returnTo}
      showSearch={isAllTab}
      allowPinning={allowPinning}
    >
      {isAllTab && (
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
          {t("linkHub.creditSuffix")}
        </p>
      )}
    </DashboardLinksWithSearch>
  );
}
