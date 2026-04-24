"use client";

import { Eye, EyeOff, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { dashboardTabToolbarItemClass } from "@/components/filters/dashboard-tab-toolbar";
import {
  getApplicableBusRoutes,
  getDefaultBusSelection,
  resolveClientBusDayType,
} from "@/features/bus/lib/bus-client";
import type { BusTimetableData } from "@/features/bus/lib/bus-types";
import { extractApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/shared/lib/utils";
import { AUTO_SAVE_DELAY_MS } from "./bus-panel-shared";
import { BusPlannerControls } from "./bus-planner-controls";
import { BusRouteTable } from "./bus-route-table";

type BusPanelProps = {
  data: BusTimetableData;
  signedIn?: boolean;
  showPreferences?: boolean;
  className?: string;
};

export function BusPanel({
  data,
  signedIn = false,
  showPreferences = false,
  className,
}: BusPanelProps) {
  const t = useTranslations("bus");
  const [, startTransition] = useTransition();
  const defaultSelection = useMemo(
    () => getDefaultBusSelection(data, data.preferences),
    [data],
  );

  const [selectedDayType, setSelectedDayType] = useState<"weekday" | "weekend">(
    "weekday",
  );
  const [startCampusId, setStartCampusId] = useState<number | null>(
    defaultSelection.startCampusId,
  );
  const [endCampusId, setEndCampusId] = useState<number | null>(
    defaultSelection.endCampusId,
  );
  const [showDepartedTrips, setShowDepartedTrips] = useState(
    data.preferences?.showDepartedTrips ?? false,
  );
  const [now, setNow] = useState(() => new Date());
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedDayType(resolveClientBusDayType(new Date()));
    setNow(new Date());

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const applicableRoutes = useMemo(
    () =>
      getApplicableBusRoutes({
        data,
        dayType: selectedDayType,
        startCampusId,
        endCampusId,
        showDepartedTrips,
        now,
      }),
    [data, selectedDayType, startCampusId, endCampusId, showDepartedTrips, now],
  );

  const showPlannerEstimatedHint = useMemo(() => {
    const inVisibleRows = applicableRoutes.some((route) =>
      route.visibleTrips.some((trip) =>
        trip.stopTimes.some((stopTime) => stopTime.isEstimated),
      ),
    );
    if (inVisibleRows) return true;
    return data.trips.some(
      (trip) =>
        trip.dayType === selectedDayType &&
        trip.stopTimes.some((stopTime) => stopTime.time == null),
    );
  }, [applicableRoutes, data.trips, selectedDayType]);

  const savePreference = useCallback(
    (
      nextStartCampusId: number | null,
      nextEndCampusId: number | null,
      nextShowDepartedTrips: boolean,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSaveState("saving");
      setSaveError(null);

      startTransition(async () => {
        try {
          const response = await fetch("/api/bus/preferences", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              preferredOriginCampusId: nextStartCampusId,
              preferredDestinationCampusId: nextEndCampusId,
              showDepartedTrips: nextShowDepartedTrips,
            }),
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          let body: unknown = null;
          try {
            body = await response.json();
          } catch {
            body = null;
          }

          if (!response.ok) {
            setSaveState("error");
            setSaveError(
              extractApiErrorMessage(body) ?? t("preferences.saveFailed"),
            );
            return;
          }

          setSaveState("saved");
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
          setSaveState("error");
          setSaveError(t("preferences.saveFailed"));
        }
      });
    },
    [t],
  );

  useEffect(() => {
    if (!signedIn || !showPreferences || !dirtyRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      savePreference(startCampusId, endCampusId, showDepartedTrips);
      dirtyRef.current = false;
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    endCampusId,
    savePreference,
    showDepartedTrips,
    showPreferences,
    signedIn,
    startCampusId,
  ]);

  const markDirty = useCallback(() => {
    if (!signedIn || !showPreferences) return;
    dirtyRef.current = true;
    setSaveState("idle");
    setSaveError(null);
  }, [showPreferences, signedIn]);

  const handleSwap = useCallback(() => {
    markDirty();
    setStartCampusId(endCampusId);
    setEndCampusId(startCampusId);
  }, [endCampusId, markDirty, startCampusId]);

  const plannerMeta =
    saveState === "saving"
      ? t("preferences.saving")
      : saveState === "saved"
        ? t("preferences.saved")
        : saveState === "error"
          ? (saveError ?? t("preferences.saveFailed"))
          : showPreferences && signedIn
            ? t("preferences.autosaveHint")
            : t("planner.clientHint");

  const plannerActions = (
    <>
      <Link
        href="/bus-map"
        className={cn(
          dashboardTabToolbarItemClass(
            false,
            "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border/70 bg-background px-3 font-medium text-sm",
          ),
        )}
      >
        <MapIcon aria-hidden="true" className="h-4 w-4" />
        <span>{t("transitMap")}</span>
      </Link>

      <button
        type="button"
        onClick={() => {
          markDirty();
          setShowDepartedTrips((value) => !value);
        }}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          showDepartedTrips
            ? "border-foreground bg-foreground text-background"
            : "border-border/70 bg-background text-foreground hover:bg-muted/30",
        )}
        aria-pressed={showDepartedTrips}
        aria-label={t("query.showDepartedTrips")}
      >
        {showDepartedTrips ? (
          <Eye aria-hidden="true" className="h-4 w-4" />
        ) : (
          <EyeOff aria-hidden="true" className="h-4 w-4" />
        )}
        <span>{t("query.showDepartedTrips")}</span>
      </button>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
        className,
      )}
    >
      <BusPlannerControls
        data={data}
        endCampusId={endCampusId}
        handleSwap={handleSwap}
        markDirty={markDirty}
        selectedDayType={selectedDayType}
        setEndCampusId={setEndCampusId}
        setSelectedDayType={setSelectedDayType}
        setStartCampusId={setStartCampusId}
        startCampusId={startCampusId}
        t={t}
      />

      <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:min-w-0 lg:flex-1">
        {signedIn && showPreferences ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
            <p
              aria-live="polite"
              className={cn(
                "text-xs",
                saveState === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {plannerMeta}
            </p>
          </div>
        ) : null}

        <BusRouteTable
          routes={applicableRoutes}
          t={t}
          actions={plannerActions}
          footer={
            data.notice?.message || showPlannerEstimatedHint ? (
              <>
                {data.notice?.message ? (
                  <p className="text-muted-foreground text-xs">
                    {data.notice.url ? (
                      <a
                        href={data.notice.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {data.notice.message}
                      </a>
                    ) : (
                      data.notice.message
                    )}
                  </p>
                ) : null}
                {showPlannerEstimatedHint ? (
                  <p className="text-muted-foreground text-xs">
                    {t("planner.estimatedHint")}
                  </p>
                ) : null}
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
