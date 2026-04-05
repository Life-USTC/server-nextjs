import type {
  BusDashboardData,
  DashboardNavStats,
  HomeworkSummaryItem,
  OverviewData,
  SectionOption,
  SubscriptionsTabData,
  TodoItem,
} from "@/app/dashboard/dashboard-data";
import { PageLayout } from "@/components/page-layout";
import { BusPanel } from "@/features/bus/components/bus-panel";
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
  "bus",
  "links",
  "homeworks",
  "todos",
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
    calendarView?: string;
    calendarMonth?: string;
    calendarWeek?: string;
    overviewWeek?: string;
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
  calendarSubscriptionUrl: string | null;
  todosData: TodoItem[] | null;
  busData: BusDashboardData | null;
};

export async function HomeView({
  searchParams,
  navStats,
  overviewData,
  homeworksData,
  subscriptionsData,
  calendarSubscriptionUrl,
  todosData,
  busData,
}: HomeViewProps) {
  const params = await searchParams;
  const currentTab = parseTab(params.tab);
  const pendingHomeworksCount = navStats.pendingHomeworksCount;
  const hasDueTodayHomework = navStats.highlightPendingHomeworks;
  const examsCount = navStats.examsCount;
  const pendingTodosCount = navStats.pendingTodosCount;

  return (
    <PageLayout
      className="home-dashboard-layout pt-2 md:pt-3 lg:pt-3"
      headerClassName="gap-5 pb-4.5 md:gap-6 md:pb-5.5"
      headerChildren={
        <HomeTabNav
          currentTab={currentTab}
          pendingHomeworksCount={pendingHomeworksCount}
          highlightPendingHomeworks={hasDueTodayHomework}
          examsCount={examsCount}
          pendingTodosCount={pendingTodosCount}
        />
      }
    >
      <section className="w-full min-w-0 space-y-6">
        {currentTab === "overview" && overviewData && (
          <OverviewPanel
            data={overviewData}
            todosData={todosData ?? []}
            overviewWeek={params.overviewWeek}
          />
        )}
        {currentTab === "calendar" && overviewData && (
          <CalendarPanel
            data={overviewData}
            calendarSubscriptionUrl={calendarSubscriptionUrl}
            view={params.calendarView}
            month={params.calendarMonth}
            week={params.calendarWeek}
          />
        )}
        {currentTab === "bus" && busData?.snapshot && (
          <BusPanel
            data={busData.snapshot.data}
            signedIn={true}
            showPreferences={true}
          />
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
    </PageLayout>
  );
}
