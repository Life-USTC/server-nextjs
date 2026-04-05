import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BusTransitMap } from "@/features/bus/components/bus-transit-map";
import { getBusMapData } from "@/features/bus/lib/bus-service";
import type { AppLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.busMap"),
  };
}

export default async function BusMapPage() {
  const locale = (await getLocale()) as AppLocale;
  const data = await getBusMapData({ locale });

  return <BusTransitMap data={data} />;
}
