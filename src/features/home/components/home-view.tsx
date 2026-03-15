import { getTranslations } from "next-intl/server";
import type {
  DashboardNavStats,
  HomeworkSummaryItem,
  OverviewData,
  SectionOption,
  SubscriptionsTabData,
  TodoItem,
} from "@/app/dashboard/dashboard-data";
import { LinksTabPanel } from "@/features/dashboard-links/components/links-tab-panel";
import { TodosPanel } from "@/features/todos/components/todos-panel";
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
  "todos",
  "exams",
  "subscriptions",
  "links",
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
  todosData: TodoItem[] | null;
};

export async function HomeView({
  searchParams,
  navStats,
  overviewData,
  homeworksData,
  subscriptionsData,
  todosData,
}: HomeViewProps) {
  const params = await searchParams;
  const currentTab = parseTab(params.tab);
  const t = await getTranslations("meDashboard");
  const rawUserName = navStats.user.name ?? navStats.user.username;
  const userName = rawUserName?.trim() ? rawUserName : t("fallbackName");
  const pendingHomeworksCount = navStats.pendingHomeworksCount;
  const hasDueTodayHomework = navStats.highlightPendingHomeworks;
  const examsCount = navStats.examsCount;
  const pendingTodosCount = navStats.pendingTodosCount;

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
          pendingTodosCount={pendingTodosCount}
        />
      </div>

      <section className="w-full min-w-0 space-y-6">
        {currentTab === "overview" && overviewData && (
          <OverviewPanel data={overviewData} todosData={todosData ?? []} />
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
        {currentTab === "todos" && <TodosPanel todos={todosData ?? []} />}
        {currentTab === "exams" && subscriptionsData && (
          <ExamsPanel data={subscriptionsData} />
        )}
        {currentTab === "subscriptions" && subscriptionsData && (
          <SubscriptionsPanel data={subscriptionsData} />
        )}
        {currentTab === "links" && overviewData && (
          <LinksTabPanel links={overviewData.dashboardLinks} />
        )}
      </section>
    </main>
  );
}
