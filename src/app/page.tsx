import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getDashboardNavStats,
  getDashboardOverviewData,
  getHomeworksTabData,
  getSubscriptionsTabData,
} from "@/app/dashboard/dashboard-data";
import { HomeView } from "@/features/home/components/home-view";
import { requireSignedInUserId } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

type HomeSearchParams = {
  tab?: string;
  debugDate?: string;
  debugTools?: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.meDashboard"),
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const userId = await requireSignedInUserId();
  const resolvedSearchParams = await searchParams;
  const debugTools =
    resolvedSearchParams.debugTools === "1" ||
    resolvedSearchParams.debugTools === "true";

  const [navStats, overviewData, homeworksData, subscriptionsData] =
    await Promise.all([
      getDashboardNavStats(userId, {
        debugDate: resolvedSearchParams.debugDate,
        debugTools,
      }),
      getDashboardOverviewData(userId, {
        debugDate: resolvedSearchParams.debugDate,
        debugTools,
      }),
      getHomeworksTabData(userId),
      getSubscriptionsTabData(userId),
    ]);

  if (!navStats) {
    return null;
  }

  return (
    <HomeView
      searchParams={Promise.resolve(resolvedSearchParams)}
      navStats={navStats}
      overviewData={overviewData}
      homeworksData={homeworksData}
      subscriptionsData={subscriptionsData}
    />
  );
}
