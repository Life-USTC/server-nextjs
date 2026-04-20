import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getBusTabData,
  getCalendarSubscriptionUrl,
  getDashboardNavStats,
  getDashboardOverviewData,
  getHomeworksTabData,
  getLinksTabData,
  getPublicDashboardLinksData,
  getSubscriptionsTabData,
  getTodosTabData,
} from "@/app/dashboard/dashboard-data";
import { auth } from "@/auth";
import { queryBusSchedules } from "@/features/bus/lib/bus-service";
import type { BusLocale } from "@/features/bus/lib/bus-types";
import { HomeView } from "@/features/home/components/home-view";
import { PublicHomeView } from "@/features/home/components/public-home-view";

export const dynamic = "force-dynamic";

type HomeSearchParams = {
  tab?: string;
  dayType?: string;
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
    const parsedCalendarSemester = parseInt(params.calendarSemester ?? "", 10);
    const busDayType: "weekday" | "weekend" | undefined =
      params.dayType === "weekday" || params.dayType === "weekend"
        ? params.dayType
        : undefined;
    const overviewOptions =
      tab === "calendar" &&
      Number.isFinite(parsedCalendarSemester) &&
      parsedCalendarSemester > 0
        ? {
            calendarSemesterId: parsedCalendarSemester,
            busDayType,
            skipLinks: true,
          }
        : tab === "calendar"
          ? { busDayType, skipLinks: true }
          : { busDayType };

    const [
      navStats,
      overviewData,
      linksData,
      homeworksData,
      subscriptionsData,
      calendarSubscriptionUrl,
      todosData,
      busData,
    ] = await Promise.all([
      getDashboardNavStats(session.user.id),
      tab === "overview" || tab === "calendar"
        ? getDashboardOverviewData(session.user.id, overviewOptions)
        : Promise.resolve(null),
      tab === "links"
        ? getLinksTabData(session.user.id)
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
      tab === "bus"
        ? getBusTabData(session.user.id, { busDayType })
        : Promise.resolve(null),
    ]);

    if (!navStats) {
      return (
        <main className="page-main flex flex-col gap-5 md:gap-6">
          <p className="text-muted-foreground">User not found.</p>
        </main>
      );
    }

    return (
      <HomeView
        searchParams={searchParams}
        navStats={navStats}
        overviewData={overviewData}
        linksData={linksData?.dashboardLinks ?? null}
        homeworksData={homeworksData}
        subscriptionsData={subscriptionsData}
        calendarSubscriptionUrl={
          subscriptionsData?.calendarSubscriptionUrl ??
          calendarSubscriptionUrl ??
          null
        }
        todosData={todosData}
        busData={busData}
      />
    );
  }

  const params = await searchParams;
  const publicTab = params.tab;

  // Fetch bus data for public view — bus is the default public tab,
  // so load data unless the user explicitly selected the "links" tab
  let publicBusData = null;
  if (publicTab !== "links") {
    const locale = await getLocale();
    const busLocale: BusLocale = locale === "en-us" ? "en-us" : "zh-cn";
    const dayType: "weekday" | "weekend" | undefined =
      params.dayType === "weekday" || params.dayType === "weekend"
        ? params.dayType
        : undefined;
    publicBusData = await queryBusSchedules({
      locale: busLocale,
      userId: null,
      dayType,
    });
  }

  return (
    <PublicHomeView
      searchParams={searchParams}
      dashboardLinks={getPublicDashboardLinksData().dashboardLinks}
      busData={publicBusData}
    />
  );
}
