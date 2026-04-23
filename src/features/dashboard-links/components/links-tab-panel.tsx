import type { DashboardLinkSummary } from "@/features/home/server/dashboard-link-data";
import { DashboardLinksPanel } from "./dashboard-links-panel";

export function LinksTabPanel({
  links,
  allowPinning = true,
}: {
  links: DashboardLinkSummary[];
  allowPinning?: boolean;
}) {
  return (
    <DashboardLinksPanel
      links={links}
      variant="all"
      allowPinning={allowPinning}
    />
  );
}
