import { getTranslations } from "next-intl/server";
import type {
  DashboardNavStats,
  HomeworkSummaryItem,
  OverviewData,
  SectionOption,
  SubscriptionsTabData,
} from "@/app/dashboard/dashboard-data";
import { CalendarPanel } from "./calendar-panel";
import { ExamsPanel } from "./exams-panel";
import { type HomeTabId, HomeTabNav } from "./home-tab-nav";
import { HomeworksPanel } from "./homeworks-panel";
import { OverviewPanel } from "./overview-panel";
import { SubscriptionsPanel } from "./subscriptions-panel";

const VALID_TABS: HomeTabId[] = [
  "overview",
  "calendar",
  "homeworks",
  "exams",
  "subscriptions",
];

function parseTab(tab: string | undefined): HomeTabId {
  if (tab && VALID_TABS.includes(tab as HomeTabId)) {
    return tab as HomeTabId;
  }
  return "overview";
}

type HomeViewProps = {
  searchParams: Promise<{
    tab?: string;
    debugDate?: string;
    debugTools?: string;
  }>;
  navStats: DashboardNavStats;
  overviewData: OverviewData | null;
  homeworksData: {
    homeworkSummaries: HomeworkSummaryItem[];
    sections: SectionOption[];
  } | null;
  subscriptionsData: SubscriptionsTabData | null;
};

export async function HomeView({
  searchParams,
  navStats,
  overviewData,
  homeworksData,
  subscriptionsData,
}: HomeViewProps) {
  const params = await searchParams;
  const currentTab = parseTab(params.tab);
  const t = await getTranslations("meDashboard");
  const rawUserName = navStats.user.name ?? navStats.user.username;
  const userName = rawUserName?.trim() ? rawUserName : t("fallbackName");
  const pendingHomeworksCount = navStats.pendingHomeworksCount;
  const hasDueTodayHomework = navStats.highlightPendingHomeworks;
  const examsCount = navStats.examsCount;

  return (
    <main className="page-main">
      <div className="mb-6">
        <h1 className="mb-3 text-display">
          {t("descriptionV2", { name: userName })}
        </h1>
        <HomeTabNav
          currentTab={currentTab}
          pendingHomeworksCount={pendingHomeworksCount}
          highlightPendingHomeworks={hasDueTodayHomework}
          examsCount={examsCount}
        />
      </div>

      <section className="w-full min-w-0 max-w-5xl space-y-6">
        {currentTab === "overview" && overviewData && (
          <OverviewPanel data={overviewData} />
        )}
        {currentTab === "calendar" && overviewData && (
          <CalendarPanel data={overviewData} />
        )}
        {currentTab === "homeworks" && (
          <HomeworksPanel
            homeworkSummaries={homeworksData?.homeworkSummaries ?? []}
            sections={homeworksData?.sections ?? []}
          />
        )}
        {currentTab === "exams" && subscriptionsData && (
          <ExamsPanel data={subscriptionsData} />
        )}
        {currentTab === "subscriptions" && subscriptionsData && (
          <SubscriptionsPanel data={subscriptionsData} />
        )}
      </section>
    </main>
  );
}
