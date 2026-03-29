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
import { getActiveScheduleConfig } from "@/features/bus-schedule/server/bus-schedule-server";

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
        <BusScheduleView
          config={JSON.parse(
            JSON.stringify(config, (_, value) =>
              value instanceof Date ? value.toISOString() : value,
            ),
          )}
        />
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
