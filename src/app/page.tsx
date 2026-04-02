import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getCalendarSubscriptionUrl,
  getDashboardNavStats,
  getDashboardOverviewData,
  getHomeworksTabData,
  getPublicDashboardLinksData,
  getSubscriptionsTabData,
  getTodosTabData,
} from "@/app/dashboard/dashboard-data";
import { auth } from "@/auth";
import { HomeView } from "@/features/home/components/home-view";
import { PublicHomeView } from "@/features/home/components/public-home-view";

export const dynamic = "force-dynamic";

type HomeSearchParams = {
  tab?: string;
  debugDate?: string;
  debugTools?: string;
  calendarSemester?: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.home"),
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const session = await auth();

  if (session?.user?.id) {
    const params = await searchParams;
    const tab = params.tab ?? "overview";
    const debugOptions = {
      debugDate: params.debugDate,
      debugTools: params.debugTools === "1" || params.debugTools === "true",
    };
    const parsedCalendarSemester = parseInt(params.calendarSemester ?? "", 10);
    const overviewOptions =
      tab === "calendar" &&
      Number.isFinite(parsedCalendarSemester) &&
      parsedCalendarSemester > 0
        ? { ...debugOptions, calendarSemesterId: parsedCalendarSemester }
        : debugOptions;

    const [
      navStats,
      overviewData,
      homeworksData,
      subscriptionsData,
      calendarSubscriptionUrl,
      todosData,
    ] = await Promise.all([
      getDashboardNavStats(session.user.id, debugOptions),
      tab === "overview" || tab === "calendar" || tab === "links"
        ? getDashboardOverviewData(session.user.id, overviewOptions)
        : Promise.resolve(null),
      tab === "homeworks"
        ? getHomeworksTabData(session.user.id)
        : Promise.resolve(null),
      tab === "subscriptions" || tab === "exams"
        ? getSubscriptionsTabData(session.user.id)
        : Promise.resolve(null),
      tab === "calendar"
        ? getCalendarSubscriptionUrl(session.user.id)
        : Promise.resolve(null),
      tab === "todos" || tab === "overview"
        ? getTodosTabData(session.user.id)
        : Promise.resolve(null),
    ]);

    if (!navStats) {
      return (
        <main className="page-main">
          <p className="text-muted-foreground">User not found.</p>
        </main>
      );
    }

    return (
      <HomeView
        searchParams={searchParams}
        navStats={navStats}
        overviewData={overviewData}
        homeworksData={homeworksData}
        subscriptionsData={subscriptionsData}
        calendarSubscriptionUrl={
          subscriptionsData?.calendarSubscriptionUrl ??
          calendarSubscriptionUrl ??
          null
        }
        todosData={todosData}
      />
    );
  }

  return (
    <PublicHomeView
      searchParams={searchParams}
      dashboardLinks={getPublicDashboardLinksData().dashboardLinks}
    />
  );
}
