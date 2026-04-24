import { CopyCalendarLinkButton } from "@/components/copy-calendar-link-button";
import {
  DashboardTabToolbar,
  DashboardTabToolbarGroup,
  dashboardTabToolbarItemClass,
} from "@/components/filters/dashboard-tab-toolbar";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { CalendarView } from "./calendar-panel-shared";

export function CalendarPanelToolbar({
  activeCalendarSemesterName,
  baseHref,
  calendarSubscriptionUrl,
  currentMonthLabel,
  currentView,
  monthNextHref,
  monthPrevHref,
  nextSemesterHref,
  prevSemesterHref,
  t,
  tSection,
  tSubscriptions,
  weekLabel,
  weekNextHref,
  weekPrevHref,
}: {
  activeCalendarSemesterName: string | null;
  baseHref: string;
  calendarSubscriptionUrl: string | null;
  currentMonthLabel: string;
  currentView: CalendarView;
  monthNextHref: string;
  monthPrevHref: string;
  nextSemesterHref: string | null;
  prevSemesterHref: string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  tSection: (key: string, values?: Record<string, string | number>) => string;
  tSubscriptions: (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  weekLabel: string;
  weekNextHref: string;
  weekPrevHref: string;
}) {
  const contextNavBtnClass =
    "shrink-0 rounded-lg px-2.5 py-1.5 text-sm no-underline transition-colors hover:bg-background/90";
  const contextNavLabelClass =
    "min-w-0 shrink text-center font-medium text-foreground text-sm";

  return (
    <DashboardTabToolbar className="grid grid-cols-1 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:gap-y-0">
      <div className="flex justify-start">
        <DashboardTabToolbarGroup className="shrink-0 overflow-hidden">
          {(
            [
              { id: "semester", labelKey: "calendarViewSemester" as const },
              { id: "month", labelKey: "calendarViewMonth" as const },
              { id: "week", labelKey: "calendarViewWeek" as const },
            ] as const
          ).map((item) => {
            const active = currentView === item.id;
            return (
              <Link
                key={item.id}
                href={`${baseHref}&calendarView=${item.id}`}
                className={dashboardTabToolbarItemClass(active)}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </DashboardTabToolbarGroup>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
        {currentView === "month" ? (
          <DashboardTabToolbarGroup className="justify-center">
            <Link href={monthPrevHref} className={contextNavBtnClass}>
              {tSection("previousMonth")}
            </Link>
            <span
              className={cn(
                contextNavLabelClass,
                "max-w-[12rem] truncate sm:max-w-none",
              )}
            >
              {currentMonthLabel}
            </span>
            <Link href={monthNextHref} className={contextNavBtnClass}>
              {tSection("nextMonth")}
            </Link>
          </DashboardTabToolbarGroup>
        ) : currentView === "week" ? (
          <DashboardTabToolbarGroup className="justify-center">
            <Link href={weekPrevHref} className={contextNavBtnClass}>
              {t("calendarWeek.prev")}
            </Link>
            <span className={contextNavLabelClass}>{weekLabel}</span>
            <Link href={weekNextHref} className={contextNavBtnClass}>
              {t("calendarWeek.next")}
            </Link>
          </DashboardTabToolbarGroup>
        ) : (
          <DashboardTabToolbarGroup className="justify-center">
            {prevSemesterHref ? (
              <Link href={prevSemesterHref} className={contextNavBtnClass}>
                {t("calendarSemesterPrev")}
              </Link>
            ) : (
              <span
                className={cn(
                  contextNavBtnClass,
                  "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent hover:text-muted-foreground",
                )}
                aria-disabled
              >
                {t("calendarSemesterPrev")}
              </span>
            )}
            <span
              className={cn(
                contextNavLabelClass,
                "max-w-[min(100%,14rem)] truncate",
              )}
            >
              {activeCalendarSemesterName ?? "—"}
            </span>
            {nextSemesterHref ? (
              <Link href={nextSemesterHref} className={contextNavBtnClass}>
                {t("calendarSemesterNext")}
              </Link>
            ) : (
              <span
                className={cn(
                  contextNavBtnClass,
                  "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent hover:text-muted-foreground",
                )}
                aria-disabled
              >
                {t("calendarSemesterNext")}
              </span>
            )}
          </DashboardTabToolbarGroup>
        )}
      </div>

      <div className="flex justify-center sm:shrink-0 sm:justify-end">
        {calendarSubscriptionUrl ? (
          <CopyCalendarLinkButton
            url={calendarSubscriptionUrl}
            label={tSubscriptions("iCalLink")}
            copiedMessage={tSubscriptions("linkCopied")}
            copiedDescription={tSubscriptions("linkCopiedDescription")}
          />
        ) : null}
      </div>
    </DashboardTabToolbar>
  );
}
