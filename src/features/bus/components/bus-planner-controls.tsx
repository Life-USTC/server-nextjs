"use client";

import { ArrowLeftRight } from "lucide-react";
import {
  DashboardTabToolbarGroup,
  dashboardTabToolbarItemClass,
} from "@/components/filters/dashboard-tab-toolbar";
import type { BusTimetableData } from "@/features/bus/lib/bus-types";
import { cn } from "@/lib/utils";

function PlannerDayTypePills({
  value,
  onChange,
  t,
}: {
  value: "weekday" | "weekend";
  onChange: (value: "weekday" | "weekend") => void;
  t: (key: string) => string;
}) {
  return (
    <DashboardTabToolbarGroup className="rounded-xl border-border/70 bg-background/90 p-1">
      {(["weekday", "weekend"] as const).map((dayType) => (
        <button
          key={dayType}
          type="button"
          aria-pressed={value === dayType}
          onClick={() => onChange(dayType)}
          className={dashboardTabToolbarItemClass(
            value === dayType,
            "min-h-9 rounded-lg px-3 font-medium text-sm",
          )}
        >
          {t(`dayType.${dayType}`)}
        </button>
      ))}
    </DashboardTabToolbarGroup>
  );
}

function StopPicker({
  testId,
  label,
  campuses,
  selectedId,
  onSelect,
}: {
  testId: string;
  label: string;
  campuses: BusTimetableData["campuses"];
  selectedId: number | null;
  onSelect: (campusId: number) => void;
}) {
  return (
    <section className="space-y-2.5">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
        {label}
      </p>
      <fieldset
        data-testid={testId}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
      >
        <legend className="sr-only">{label}</legend>
        {campuses.map((campus) => {
          const isSelected = selectedId === campus.id;
          return (
            <button
              key={campus.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(campus.id)}
              className={cn(
                "flex min-h-11 w-full touch-manipulation items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-foreground bg-foreground text-background shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                  : "border-border/70 bg-background/80 text-foreground hover:border-foreground/25 hover:bg-muted/30",
              )}
            >
              <span className="truncate text-sm">{campus.namePrimary}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full border transition-colors",
                  isSelected
                    ? "border-background/80 bg-background"
                    : "border-border/80 bg-transparent",
                )}
              />
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}

export function BusPlannerControls({
  data,
  endCampusId,
  handleSwap,
  markDirty,
  selectedDayType,
  setEndCampusId,
  setSelectedDayType,
  setStartCampusId,
  startCampusId,
  t,
}: {
  data: BusTimetableData;
  endCampusId: number | null;
  handleSwap: () => void;
  markDirty: () => void;
  selectedDayType: "weekday" | "weekend";
  setEndCampusId: (value: number | null) => void;
  setSelectedDayType: (value: "weekday" | "weekend") => void;
  setStartCampusId: (value: number | null) => void;
  startCampusId: number | null;
  t: (key: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 border-border/50 border-b pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PlannerDayTypePills
              value={selectedDayType}
              onChange={setSelectedDayType}
              t={t}
            />
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
          <StopPicker
            testId="bus-start-stop-group"
            label={t("planner.start")}
            campuses={data.campuses}
            selectedId={startCampusId}
            onSelect={(campusId) => {
              markDirty();
              if (endCampusId != null && campusId === endCampusId) {
                setEndCampusId(startCampusId);
                setStartCampusId(campusId);
              } else {
                setStartCampusId(campusId);
              }
            }}
          />

          <div className="flex items-center justify-center lg:items-start lg:pt-9">
            <button
              type="button"
              onClick={handleSwap}
              className={cn(
                dashboardTabToolbarItemClass(
                  false,
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                ),
              )}
              aria-label={t("planner.reverse")}
            >
              <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t("planner.reverse")}</span>
            </button>
          </div>

          <StopPicker
            testId="bus-end-stop-group"
            label={t("planner.end")}
            campuses={data.campuses}
            selectedId={endCampusId}
            onSelect={(campusId) => {
              markDirty();
              if (startCampusId != null && campusId === startCampusId) {
                setStartCampusId(endCampusId);
                setEndCampusId(campusId);
              } else {
                setEndCampusId(campusId);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
