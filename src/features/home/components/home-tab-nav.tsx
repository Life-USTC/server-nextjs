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
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-medium text-sm no-underline transition-colors",
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
      <Link
        href="/?tab=subscriptions"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-medium text-sm no-underline transition-colors sm:ml-auto",
          currentTab === "subscriptions"
            ? "border-border/80 bg-card text-foreground"
            : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/70 hover:text-foreground",
        )}
      >
        <BookOpen className="h-4 w-4" />
        {tabLabels.subscriptions}
      </Link>
    </nav>
  );
}
