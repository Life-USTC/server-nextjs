"use client";

import { ChevronDown } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BusCampusSummary,
  BusRouteSummary,
  BusUserPreferenceSummary,
} from "@/features/bus/lib/bus-types";
import { extractApiErrorMessage } from "@/lib/api/client";

type BusPreferenceFormProps = {
  campuses: BusCampusSummary[];
  routes: BusRouteSummary[];
  preference: BusUserPreferenceSummary | null;
  signedIn: boolean;
  onSaved?: (nextPreference: BusUserPreferenceSummary) => void;
};

export function BusPreferenceForm({
  campuses,
  routes,
  preference,
  signedIn,
  onSaved,
}: BusPreferenceFormProps) {
  const t = useTranslations("bus");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [originCampusId, setOriginCampusId] = useState(
    preference?.preferredOriginCampusId
      ? String(preference.preferredOriginCampusId)
      : "",
  );
  const [destinationCampusId, setDestinationCampusId] = useState(
    preference?.preferredDestinationCampusId
      ? String(preference.preferredDestinationCampusId)
      : "",
  );
  const [favoriteCampusIds, setFavoriteCampusIds] = useState<number[]>(
    preference?.favoriteCampusIds ?? [],
  );
  const [favoriteRouteIds, setFavoriteRouteIds] = useState<number[]>(
    preference?.favoriteRouteIds ?? [],
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      preference?.favoriteCampusIds.length ||
        preference?.favoriteRouteIds.length,
    ),
  );

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-border border-dashed px-4 py-3 text-muted-foreground text-sm">
        {t("preferences.signInHint")}
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
          const response = await fetch("/api/bus/preferences", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              preferredOriginCampusId: originCampusId
                ? Number.parseInt(originCampusId, 10)
                : null,
              preferredDestinationCampusId: destinationCampusId
                ? Number.parseInt(destinationCampusId, 10)
                : null,
              favoriteCampusIds,
              favoriteRouteIds,
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

          setSuccess(t("preferences.saved"));
          onSaved?.(nextPreference);
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bus-origin-select">{t("preferences.origin")}</Label>
          <Select
            value={originCampusId}
            onValueChange={(value) => setOriginCampusId(value ?? "")}
          >
            <SelectTrigger id="bus-origin-select">
              <SelectValue placeholder={t("preferences.unset")}>
                {() => {
                  if (!originCampusId) return t("preferences.unset");
                  return (
                    campuses.find((c) => String(c.id) === originCampusId)
                      ?.namePrimary ?? t("preferences.unset")
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("preferences.unset")}</SelectItem>
              {campuses.map((campus) => (
                <SelectItem key={campus.id} value={String(campus.id)}>
                  {campus.namePrimary}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bus-destination-select">
            {t("preferences.destination")}
          </Label>
          <Select
            value={destinationCampusId}
            onValueChange={(value) => setDestinationCampusId(value ?? "")}
          >
            <SelectTrigger id="bus-destination-select">
              <SelectValue placeholder={t("preferences.unset")}>
                {() => {
                  if (!destinationCampusId) return t("preferences.unset");
                  return (
                    campuses.find((c) => String(c.id) === destinationCampusId)
                      ?.namePrimary ?? t("preferences.unset")
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("preferences.unset")}</SelectItem>
              {campuses.map((campus) => (
                <SelectItem key={campus.id} value={String(campus.id)}>
                  {campus.namePrimary}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/20">
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="space-y-1">
            <p className="font-medium text-sm">{t("preferences.advanced")}</p>
            <p className="text-muted-foreground text-xs">
              {t("preferences.advancedDescription")}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>
        {showAdvanced ? (
          <div className="grid gap-4 border-border/80 border-t px-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("preferences.favoriteCampuses")}</Label>
              <Combobox
                multiple
                value={favoriteCampusIds}
                onValueChange={setFavoriteCampusIds}
              >
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
            </div>

            <div className="space-y-2">
              <Label>{t("preferences.favoriteRoutes")}</Label>
              <Combobox
                multiple
                value={favoriteRouteIds}
                onValueChange={setFavoriteRouteIds}
              >
                <ComboboxChips>
                  <ComboboxInput
                    placeholder={t("preferences.favoriteRoutesPlaceholder")}
                    size="sm"
                  />
                </ComboboxChips>
                <ComboboxPopup>
                  <ComboboxList>
                    <ComboboxEmpty>—</ComboboxEmpty>
                    {routes.map((route) => (
                      <ComboboxItem key={route.id} value={route.id}>
                        {route.descriptionPrimary}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </div>
          </div>
        ) : null}
      </div>

      {(error || success) && (
        <p className={`text-sm ${error ? "text-destructive" : "text-primary"}`}>
          {error ?? success}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? t("preferences.saving") : t("preferences.save")}
      </Button>
    </form>
  );
}
