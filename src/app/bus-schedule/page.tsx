import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { BusScheduleView } from "@/features/bus-schedule/components/bus-schedule-view";
import type { BusScheduleData } from "@/features/bus-schedule/server/bus-schedule-server";
import { getActiveScheduleConfig } from "@/features/bus-schedule/server/bus-schedule-server";

function serializeConfig(config: NonNullable<BusScheduleData>) {
  return {
    id: config.id,
    name: config.name,
    effectiveFrom: config.effectiveFrom.toISOString(),
    effectiveUntil: config.effectiveUntil?.toISOString() ?? null,
    sourceMessage: config.sourceMessage,
    sourceUrl: config.sourceUrl,
    stops: config.stops.map((s) => ({
      id: s.id,
      externalId: s.externalId,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    routes: config.routes.map((r) => ({
      id: r.id,
      routeNumber: r.routeNumber,
      stops: r.stops.map((rs) => ({
        id: rs.id,
        stopOrder: rs.stopOrder,
        stop: {
          id: rs.stop.id,
          externalId: rs.stop.externalId,
          name: rs.stop.name,
          latitude: rs.stop.latitude,
          longitude: rs.stop.longitude,
        },
      })),
      trips: r.trips.map((t) => ({
        id: t.id,
        dayType: t.dayType,
        times: t.times as (string | null)[],
      })),
    })),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("pages.busSchedule"),
  };
}

export default async function BusSchedulePage() {
  const [config, t, tCommon] = await Promise.all([
    getActiveScheduleConfig(),
    getTranslations("busSchedule"),
    getTranslations("common"),
  ]);

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("title")}</h1>
        <p className="text-muted-foreground text-subtitle">{t("subtitle")}</p>
      </div>

      {config ? (
        <BusScheduleView config={serializeConfig(config)} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noSchedule")}</EmptyTitle>
            <EmptyDescription>{t("noScheduleDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
