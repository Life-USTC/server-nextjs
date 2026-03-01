import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import { DashboardLinksPanel } from "./dashboard-links-panel";

export function LinksTabPanel({ links }: { links: DashboardLinkSummary[] }) {
  return <DashboardLinksPanel links={links} variant="all" />;
}
