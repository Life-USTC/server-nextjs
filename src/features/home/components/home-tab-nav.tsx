import {
  BookOpen,
  BookOpenCheck,
  Bus,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  Link2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type HomeTabId =
  | "overview"
  | "calendar"
  | "bus"
  | "homeworks"
  | "todos"
  | "exams"
  | "subscriptions"
  | "links";

const TAB_IDS: HomeTabId[] = [
  "overview",
  "calendar",
  "bus",
  "homeworks",
  "todos",
  "exams",
  "subscriptions",
  "links",
];

export async function HomeTabNav({
  currentTab,
  pendingHomeworksCount = 0,
  examsCount = 0,
  pendingTodosCount = 0,
  visibleTabs,
  trailingTabIds = ["subscriptions"],
  trailingContent,
}: {
  currentTab: HomeTabId;
  pendingHomeworksCount?: number;
  highlightPendingHomeworks?: boolean;
  examsCount?: number;
  pendingTodosCount?: number;
  visibleTabs?: HomeTabId[];
  trailingTabIds?: HomeTabId[];
  trailingContent?: React.ReactNode;
}) {
  const t = await getTranslations("meDashboard.nav");
  const tabLabels: Record<HomeTabId, string> = {
    overview: t("overview.title"),
    calendar: t("calendar.title"),
    bus: t("bus.title"),
    homeworks: t("homeworks.title"),
    todos: t("todos.title"),
    exams: t("exams.title"),
    subscriptions: t("subscriptions.title"),
    links: t("links.title"),
  };
  const tabIcons: Record<HomeTabId, typeof LayoutDashboard> = {
    overview: LayoutDashboard,
    calendar: CalendarDays,
    bus: Bus,
    homeworks: BookOpenCheck,
    todos: CheckSquare,
    exams: GraduationCap,
    subscriptions: BookOpen,
    links: Link2,
  };
  const tabsToRender = visibleTabs ?? TAB_IDS;
  const trailingTabIdSet = new Set(trailingTabIds);
  let hasAppliedTrailingOffset = false;

  const renderLabel = (tabId: HomeTabId, isActive: boolean) => {
    const countClassName = cn(
      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
      isActive
        ? "bg-background/90 text-foreground/75"
        : "bg-background/70 text-muted-foreground",
    );

    if (tabId === "homeworks") {
      return (
        <>
          <span>{tabLabels[tabId]}</span>
          <span className={countClassName}>{pendingHomeworksCount}</span>
        </>
      );
    }

    if (tabId === "exams") {
      return (
        <>
          <span>{tabLabels[tabId]}</span>
          <span className={countClassName}>{examsCount}</span>
        </>
      );
    }

    if (tabId === "todos") {
      return (
        <>
          <span>{tabLabels[tabId]}</span>
          <span className={countClassName}>{pendingTodosCount}</span>
        </>
      );
    }

    return tabLabels[tabId];
  };

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label={t("ariaLabel")}
    >
      {tabsToRender.map((tabId) => {
        const Icon = tabIcons[tabId];
        const isActive = currentTab === tabId;
        const href = tabId === "overview" ? "/" : `/?tab=${tabId}`;
        const shouldOffsetTrailingTab =
          trailingTabIdSet.has(tabId) && !hasAppliedTrailingOffset;

        if (shouldOffsetTrailingTab) {
          hasAppliedTrailingOffset = true;
        }

        return (
          <Link
            key={tabId}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-medium text-sm no-underline transition-colors",
              shouldOffsetTrailingTab && "sm:ml-auto",
              isActive
                ? "border-border/80 bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/70 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="inline-flex items-center gap-1.5">
              {renderLabel(tabId, isActive)}
            </span>
          </Link>
        );
      })}
      {trailingContent ? (
        <div className="sm:ml-auto">{trailingContent}</div>
      ) : null}
    </nav>
  );
}
