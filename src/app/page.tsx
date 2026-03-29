import { Bus, Calendar, User, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  getCalendarSubscriptionUrl,
  getDashboardNavStats,
  getDashboardOverviewData,
  getHomeworksTabData,
  getSubscriptionsTabData,
  getTodosTabData,
} from "@/app/dashboard/dashboard-data";
import { auth } from "@/auth";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { HomeView } from "@/features/home/components/home-view";
import { Link } from "@/i18n/routing";

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
  const [t, session] = await Promise.all([getTranslations("homepage"), auth()]);

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
    <main className="page-main">
      <section className="-mx-6 fade-in slide-in-from-left-4 mb-12 flex min-h-[100dvh] animate-in items-center justify-center px-6 duration-700 md:mx-0 md:mb-12 md:min-h-0 md:px-0">
        <div className="grid w-full grid-cols-1 items-center gap-8 py-12 md:grid-cols-2 md:gap-12">
          <div className="fade-in slide-in-from-right-4 mb-8 flex animate-in justify-center delay-200 duration-700 md:order-2 md:mb-0">
            <div className="relative animate-float">
              <Image
                src="/images/icon.png"
                alt={t("appIconAlt")}
                width={280}
                height={280}
                className="rounded-[25%] shadow-2xl shadow-primary/30"
                priority
              />
            </div>
          </div>

          <div className="space-y-6 md:order-1">
            <h1 className="text-display">
              <span className="block">{t("title.line1")}</span>
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                {t("title.line2")}
              </span>
            </h1>

            <p className="max-w-lg text-muted-foreground text-subtitle">
              {t("subtitle")}
            </p>

            <div className="flex gap-4">
              <a
                href="https://apps.apple.com/us/app/life-ustc/id1660437438"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline transition-transform hover:scale-105"
              >
                <Image
                  src="/images/appstore.svg"
                  alt={t("downloadBadgeAlt")}
                  width={150}
                  height={44}
                  priority
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="fade-in mb-12 animate-in delay-300 duration-700">
        <h2 className="mb-6 text-title-2">{t("quickAccess.title")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/sections" className="no-underline">
            <Card className="hover:-translate-y-1 h-full overflow-hidden transition-[transform,box-shadow] hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.viewSections.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="line-clamp-2 text-body text-muted-foreground">
                  {t("quickAccess.viewSections.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>

          <Link href="/teachers" className="no-underline">
            <Card className="hover:-translate-y-1 h-full overflow-hidden transition-[transform,box-shadow] hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.browseTeachers.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="line-clamp-2 text-body text-muted-foreground">
                  {t("quickAccess.browseTeachers.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>

          <Link href="/" className="no-underline">
            <Card className="hover:-translate-y-1 h-full overflow-hidden transition-[transform,box-shadow] hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.myProfile.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="line-clamp-2 text-body text-muted-foreground">
                  {t("quickAccess.myProfile.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>

          <Link href="/bus-schedule" className="no-underline">
            <Card className="hover:-translate-y-1 h-full overflow-hidden transition-[transform,box-shadow] hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Bus className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.busSchedule.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="line-clamp-2 text-body text-muted-foreground">
                  {t("quickAccess.busSchedule.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
}
