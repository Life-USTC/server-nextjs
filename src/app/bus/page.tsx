import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { PageLayout } from "@/components/page-layout";
import { BusPanel } from "@/features/bus/components/bus-panel";
import {
  getBusPreference,
  queryBusSchedules,
} from "@/features/bus/lib/bus-service";
import type { BusLocale } from "@/features/bus/lib/bus-types";

export const dynamic = "force-dynamic";

type BusPageSearchParams = {
  from?: string;
  to?: string;
  dayType?: string;
  showDeparted?: string;
  version?: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("pages.bus"),
  };
}

export default async function BusPage({
  searchParams,
}: {
  searchParams: Promise<BusPageSearchParams>;
}) {
  const [params, locale, t, session] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("bus"),
    auth(),
  ]);
  const busLocale: BusLocale = locale === "en-us" ? "en-us" : "zh-cn";

  const userId = session?.user?.id ?? null;
  const preference = await getBusPreference(userId);
  const fromParam = Number.parseInt(params.from ?? "", 10);
  const toParam = Number.parseInt(params.to ?? "", 10);
  const result = await queryBusSchedules({
    locale: busLocale,
    userId,
    originCampusId: Number.isFinite(fromParam) ? fromParam : undefined,
    destinationCampusId: Number.isFinite(toParam) ? toParam : undefined,
    dayType:
      params.dayType === "weekday" || params.dayType === "weekend"
        ? params.dayType
        : "auto",
    showDepartedTrips:
      params.showDeparted === "1" || params.showDeparted === "true"
        ? true
        : undefined,
    versionKey: params.version ?? undefined,
  });

  return (
    <PageLayout title={t("title")} description={t("description")}>
      {result ? (
        <BusPanel
          data={result}
          signedIn={Boolean(userId)}
          initialPreference={preference}
          showPreferences={Boolean(userId)}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}
    </PageLayout>
  );
}
