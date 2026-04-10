import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { getLocale, getTranslations } from "next-intl/server";
import { getBusMapData } from "@/features/bus/lib/bus-service";
import type { AppLocale } from "@/i18n/config";

const BusTransitMap = dynamicImport(
  () =>
    import("@/features/bus/components/bus-transit-map").then((mod) => ({
      default: mod.BusTransitMap,
    })),
  {
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    ),
  },
);

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
