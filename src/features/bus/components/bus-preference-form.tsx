"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Toggle, ToggleGroup } from "@/components/ui/toggle-group";
import type {
  BusCampusSummary,
  BusUserPreferenceSummary,
} from "@/features/bus/lib/bus-types";
import { extractApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/shared/lib/utils";

type BusPreferenceInlineProps = {
  campuses: BusCampusSummary[];
  preference: BusUserPreferenceSummary | null;
  onSaved?: (nextPreference: BusUserPreferenceSummary) => void;
};

const AUTO_SAVE_DELAY = 800;

/** Inline campus preference editor — toggle chips with auto-save */
export function BusPreferenceInline({
  campuses,
  preference,
  onSaved,
}: BusPreferenceInlineProps) {
  const t = useTranslations("bus");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>(
    preference?.favoriteCampusIds ?? [],
  );
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doSave = useCallback(
    (ids: number[]) => {
      setError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startTransition(async () => {
        try {
          const response = await fetch("/api/bus/preferences", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              preferredOriginCampusId:
                preference?.preferredOriginCampusId ?? null,
              preferredDestinationCampusId:
                preference?.preferredDestinationCampusId ?? null,
              favoriteCampusIds: ids,
              favoriteRouteIds: preference?.favoriteRouteIds ?? [],
              showDepartedTrips: preference?.showDepartedTrips ?? false,
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
            setError(
              extractApiErrorMessage(body) ?? t("preferences.saveFailed"),
            );
            return;
          }

          const nextPreference = (
            body as { preference?: BusUserPreferenceSummary }
          ).preference;
          if (!nextPreference) {
            setError(t("preferences.saveFailed"));
            return;
          }

          dirtyRef.current = false;
          onSaved?.(nextPreference);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setError(t("preferences.saveFailed"));
        }
      });
    },
    [preference, onSaved, t],
  );

  // Auto-save on change (debounced), skip initial mount
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSave(selectedIds), AUTO_SAVE_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedIds, doSave]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <ToggleGroup
          className="flex-wrap gap-1"
          data-testid="campus-toggle-group"
          multiple
          value={selectedIds.map(String)}
          onValueChange={(vals) => {
            dirtyRef.current = true;
            setError(null);
            setSelectedIds(vals.map(Number));
          }}
        >
          {campuses.map((campus) => (
            <Toggle
              key={campus.id}
              size="sm"
              value={String(campus.id)}
              className={cn(
                "h-6 rounded-full px-2 text-[11px]",
                selectedIds.includes(campus.id) && "font-semibold",
              )}
              aria-label={campus.namePrimary}
            >
              {campus.namePrimary}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      {error && (
        <p className="text-destructive text-xs">
          {error}{" "}
          <button
            type="button"
            onClick={() => doSave(selectedIds)}
            className="underline"
          >
            {t("preferences.save")}
          </button>
        </p>
      )}
    </div>
  );
}
