import { getTranslations } from "next-intl/server";
import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { LinksTabPanel } from "@/features/dashboard-links/components/links-tab-panel";
import { Link } from "@/i18n/routing";
import { type HomeTabId, HomeTabNav } from "./home-tab-nav";

const VALID_PUBLIC_TABS = ["links"] as const satisfies HomeTabId[];

function parsePublicTab(
  tab: string | undefined,
): (typeof VALID_PUBLIC_TABS)[number] {
  if (
    tab &&
    VALID_PUBLIC_TABS.includes(tab as (typeof VALID_PUBLIC_TABS)[number])
  ) {
    return tab as (typeof VALID_PUBLIC_TABS)[number];
  }
  return "links";
}

export async function PublicHomeView({
  searchParams,
  dashboardLinks,
}: {
  searchParams: Promise<{ tab?: string }>;
  dashboardLinks: DashboardLinkSummary[];
}) {
  const [params, t] = await Promise.all([
    searchParams,
    getTranslations("homepage"),
  ]);
  const currentTab = parsePublicTab(params.tab);

  return (
    <PageLayout
      className="home-dashboard-layout pt-2 md:pt-3 lg:pt-3"
      description={t("subtitle")}
      headerClassName="gap-5 pb-4.5 md:gap-6 md:pb-5.5"
      headerChildren={
        <HomeTabNav
          currentTab={currentTab}
          visibleTabs={["links"]}
          trailingTabIds={[]}
          trailingContent={
            <Button
              variant="outline"
              render={<Link className="no-underline" href="/signin" />}
            >
              {t("actions.signIn")}
            </Button>
          }
        />
      }
    >
      <LinksTabPanel links={dashboardLinks} allowPinning={false} />
    </PageLayout>
  );
}
