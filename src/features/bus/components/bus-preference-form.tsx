"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  BusCampusSummary,
  BusUserPreferenceSummary,
} from "@/features/bus/lib/bus-types";
import { extractApiErrorMessage } from "@/lib/api/client";

type BusPreferenceFormProps = {
  campuses: BusCampusSummary[];
  preference: BusUserPreferenceSummary | null;
  signedIn: boolean;
  onSaved?: (nextPreference: BusUserPreferenceSummary) => void;
};

function parseIdList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\s]+/)
        .map((entry) => Number.parseInt(entry, 10))
        .filter((entry) => Number.isInteger(entry)),
    ),
  );
}

export function BusPreferenceForm({
  campuses,
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
  const [favoriteCampusIdsText, setFavoriteCampusIdsText] = useState(
    preference?.favoriteCampusIds.join(", ") ?? "",
  );
  const [favoriteRouteIdsText, setFavoriteRouteIdsText] = useState(
    preference?.favoriteRouteIds.join(", ") ?? "",
  );
  const [showDepartedTrips, setShowDepartedTrips] = useState(
    preference?.showDepartedTrips ?? false,
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
              favoriteCampusIds: parseIdList(favoriteCampusIdsText),
              favoriteRouteIds: parseIdList(favoriteRouteIdsText),
              showDepartedTrips,
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
              <SelectValue placeholder={t("preferences.unset")} />
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
              <SelectValue placeholder={t("preferences.unset")} />
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bus-favorite-campus-ids">
            {t("preferences.favoriteCampuses")}
          </Label>
          <Input
            id="bus-favorite-campus-ids"
            value={favoriteCampusIdsText}
            onChange={(event) => setFavoriteCampusIdsText(event.target.value)}
            placeholder={t("preferences.idsPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bus-favorite-route-ids">
            {t("preferences.favoriteRoutes")}
          </Label>
          <Input
            id="bus-favorite-route-ids"
            value={favoriteRouteIdsText}
            onChange={(event) => setFavoriteRouteIdsText(event.target.value)}
            placeholder={t("preferences.idsPlaceholder")}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div className="space-y-1">
          <p className="font-medium text-sm">
            {t("preferences.showDepartedTrips")}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("preferences.showDepartedTripsHint")}
          </p>
        </div>
        <Switch
          checked={showDepartedTrips}
          onCheckedChange={(checked) => setShowDepartedTrips(Boolean(checked))}
          aria-label={t("preferences.showDepartedTrips")}
        />
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
