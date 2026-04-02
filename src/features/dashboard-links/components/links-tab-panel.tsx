import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
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
