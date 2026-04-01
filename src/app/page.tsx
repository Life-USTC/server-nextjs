import { ArrowUpRight, Calendar, User, Users } from "lucide-react";
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
      <section className="-mx-6 mb-10 border-border/70 border-b px-6 pb-10 md:mx-0 md:px-0 md:pb-12">
        <div className="grid w-full gap-10 pt-4 lg:grid-cols-[minmax(0,1.15fr)_20rem] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-display">
                <span className="block">{t("title.line1")}</span>
                <span className="block text-primary">{t("title.line2")}</span>
              </h1>

              <p className="max-w-2xl text-muted-foreground text-subtitle">
                {t("subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://apps.apple.com/us/app/life-ustc/id1660437438"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:-translate-y-0.5 inline-flex rounded-xl no-underline transition-transform"
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

          <aside className="rounded-xl border border-border/70 bg-card/72 p-5">
            <div className="flex items-center gap-4 border-border/60 border-b pb-4">
              <div className="rounded-[24%] border border-border/70 bg-background p-2">
                <Image
                  src="/images/icon.png"
                  alt={t("appIconAlt")}
                  width={56}
                  height={56}
                  className="rounded-[20%]"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{t("quickAccess.title")}</p>
                <p className="text-muted-foreground text-sm leading-6">
                  {t("subtitle")}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {[
                {
                  href: "/sections",
                  title: t("quickAccess.viewSections.title"),
                  description: t("quickAccess.viewSections.description"),
                  icon: Calendar,
                },
                {
                  href: "/teachers",
                  title: t("quickAccess.browseTeachers.title"),
                  description: t("quickAccess.browseTeachers.description"),
                  icon: Users,
                },
                {
                  href: "/",
                  title: t("quickAccess.myProfile.title"),
                  description: t("quickAccess.myProfile.description"),
                  icon: User,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 no-underline transition-colors hover:border-border/50 hover:bg-background/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-medium text-sm leading-6">
                          {item.title}
                        </span>
                        <ArrowUpRight className="group-hover:-translate-y-0.5 mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span className="mt-0.5 block text-muted-foreground text-sm leading-6">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
