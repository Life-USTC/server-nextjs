import {
  BookOpen,
  BookOpenCheck,
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
  | "homeworks"
  | "todos"
  | "exams"
  | "subscriptions"
  | "links";

const TAB_IDS: HomeTabId[] = [
  "overview",
  "calendar",
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
}: {
  currentTab: HomeTabId;
  pendingHomeworksCount?: number;
  highlightPendingHomeworks?: boolean;
  examsCount?: number;
  pendingTodosCount?: number;
}) {
  const t = await getTranslations("meDashboard.nav");
  const tabLabels: Record<HomeTabId, string> = {
    overview: t("overview.title"),
    calendar: t("calendar.title"),
    homeworks: t("homeworks.title"),
    todos: t("todos.title"),
    exams: t("exams.title"),
    subscriptions: t("subscriptions.title"),
    links: t("links.title"),
  };
  const tabIcons: Record<HomeTabId, typeof LayoutDashboard> = {
    overview: LayoutDashboard,
    calendar: CalendarDays,
    homeworks: BookOpenCheck,
    todos: CheckSquare,
    exams: GraduationCap,
    subscriptions: BookOpen,
    links: Link2,
  };

  return (
    <nav
      className="flex flex-wrap items-center gap-1 border-border border-b pb-2"
      aria-label={t("ariaLabel")}
    >
      {(
        TAB_IDS.filter((id) => id !== "subscriptions") as Exclude<
          HomeTabId,
          "subscriptions"
        >[]
      ).map((tabId) => {
        const Icon = tabIcons[tabId];
        const isActive = currentTab === tabId;
        const href = tabId === "overview" ? "/" : `/?tab=${tabId}`;
        return (
          <Link
            key={tabId}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm no-underline transition-colors",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tabId === "homeworks" ? (
              <span className="inline-flex items-center gap-1">
                <span>{tabLabels[tabId]}</span>
                <span className="tabular-nums opacity-70">
                  ({pendingHomeworksCount})
                </span>
              </span>
            ) : tabId === "exams" ? (
              <span className="inline-flex items-center gap-1">
                <span>{tabLabels[tabId]}</span>
                <span className="tabular-nums opacity-70">({examsCount})</span>
              </span>
            ) : tabId === "todos" ? (
              <span className="inline-flex items-center gap-1">
                <span>{tabLabels[tabId]}</span>
                <span className="tabular-nums opacity-70">
                  ({pendingTodosCount})
                </span>
              </span>
            ) : (
              tabLabels[tabId]
            )}
          </Link>
        );
      })}
      <Link
        href="/?tab=subscriptions"
        className={cn(
          "ml-auto flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm no-underline transition-colors",
          currentTab === "subscriptions"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <BookOpen className="h-4 w-4" />
        {tabLabels.subscriptions}
      </Link>
    </nav>
  );
}
