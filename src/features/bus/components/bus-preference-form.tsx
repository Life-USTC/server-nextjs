"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChips,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import type {
  BusCampusSummary,
  BusUserPreferenceSummary,
} from "@/features/bus/lib/bus-types";
import { extractApiErrorMessage } from "@/lib/api/client";

type BusPreferenceInlineProps = {
  campuses: BusCampusSummary[];
  preference: BusUserPreferenceSummary | null;
  onSaved?: (nextPreference: BusUserPreferenceSummary) => void;
};

/** Inline campus preference editor — shown under the recommended section */
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

  const handleChange = (ids: number[]) => {
    setFavoriteCampusIds(ids);
    setDirty(true);
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/bus/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          favoriteCampusIds,
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
      <Combobox multiple value={favoriteCampusIds} onValueChange={handleChange}>
        <ComboboxChips>
          <ComboboxInput
            placeholder={t("preferences.favoriteCampusesPlaceholder")}
            size="sm"
          />
        </ComboboxChips>
        <ComboboxPopup>
          <ComboboxList>
            <ComboboxEmpty>—</ComboboxEmpty>
            {campuses.map((campus) => (
              <ComboboxItem key={campus.id} value={campus.id}>
                {campus.namePrimary}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
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
