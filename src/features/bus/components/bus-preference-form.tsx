"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

/** Inline campus preference editor — shows comma-separated names when collapsed */
export function BusPreferenceInline({
  campuses,
  preference,
  onSaved,
}: BusPreferenceInlineProps) {
  const t = useTranslations("bus");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [favoriteCampusIds, setFavoriteCampusIds] = useState<number[]>(
    preference?.favoriteCampusIds ?? [],
  );
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);

  const selectedNames = campuses
    .filter((c) => favoriteCampusIds.includes(c.id))
    .map((c) => c.namePrimary);

  const toggleCampus = (id: number) => {
    setFavoriteCampusIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setDirty(true);
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      // Preserve existing preference fields to avoid wiping them
      const response = await fetch("/api/bus/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preferredOriginCampusId: preference?.preferredOriginCampusId ?? null,
          preferredDestinationCampusId:
            preference?.preferredDestinationCampusId ?? null,
          favoriteCampusIds,
          favoriteRouteIds: preference?.favoriteRouteIds ?? [],
          showDepartedTrips: preference?.showDepartedTrips ?? false,
        }),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        setError(extractApiErrorMessage(body) ?? t("preferences.saveFailed"));
        return;
      }

      const nextPreference = (body as { preference?: BusUserPreferenceSummary })
        .preference;
      if (!nextPreference) {
        setError(t("preferences.saveFailed"));
        return;
      }

      setDirty(false);
      onSaved?.(nextPreference);
    });
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-left text-xs transition-colors",
            "hover:border-border hover:bg-accent/30",
            open && "border-primary/40 ring-1 ring-primary/20",
          )}
        >
          <span
            className={cn(
              "truncate",
              selectedNames.length > 0
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {selectedNames.length > 0
              ? selectedNames.join("、")
              : t("preferences.favoriteCampusesHint")}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3 w-3 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="p-1" align="start">
          {campuses.map((campus) => {
            const selected = favoriteCampusIds.includes(campus.id);
            return (
              <button
                key={campus.id}
                type="button"
                onClick={() => toggleCampus(campus.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selected && "font-medium",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {selected && <Check className="h-2.5 w-2.5" />}
                </span>
                {campus.namePrimary}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      {dirty && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? t("preferences.saving") : t("preferences.save")}
        </Button>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
