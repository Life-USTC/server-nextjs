import { Calendar, Shield, User, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  getDashboardNavStats,
  getDashboardOverviewData,
  getHomeworksTabData,
  getSubscriptionsTabData,
} from "@/app/dashboard/dashboard-data";
import { auth } from "@/auth";
import { HomeView } from "@/components/home-view/home-view";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.home"),
  };
}

export default async function Homepage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    debugDate?: string;
    debugTools?: string;
  }>;
}) {
  const [t, session] = await Promise.all([getTranslations("homepage"), auth()]);

  if (session?.user?.id) {
    const params = await searchParams;
    const tab = params.tab ?? "overview";
    const debugOptions = {
      debugDate: params.debugDate,
      debugTools: params.debugTools === "1",
    };

    const [navStats, overviewData, homeworksData, subscriptionsData] =
      await Promise.all([
        getDashboardNavStats(session.user.id, debugOptions),
        tab === "overview" || tab === "calendar"
          ? getDashboardOverviewData(session.user.id, debugOptions)
          : Promise.resolve(null),
        tab === "homeworks"
          ? getHomeworksTabData(session.user.id)
          : Promise.resolve(null),
        tab === "subscriptions" || tab === "exams"
          ? getSubscriptionsTabData(session.user.id)
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
      />
    );
  }

  let isAdmin = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    isAdmin = user?.isAdmin ?? false;
  }

  return (
    <main className="page-main">
      {/* Hero Section */}
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

      {/* Quick Links */}
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
          {isAdmin ? (
            <Link href="/admin" className="no-underline">
              <Card className="hover:-translate-y-1 h-full overflow-hidden transition-[transform,box-shadow] hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>{t("quickAccess.admin.title")}</CardTitle>
                  </div>
                </CardHeader>
                <CardPanel>
                  <p className="line-clamp-2 text-body text-muted-foreground">
                    {t("quickAccess.admin.description")}
                  </p>
                </CardPanel>
              </Card>
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
