import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  PageBreadcrumbs,
  PageLayout,
  PageStatCard,
  PageStatGrid,
} from "@/components/page-layout";
import { requireAdminPage } from "@/lib/admin-utils";
import { prisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import { BusVersionManager } from "./bus-version-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminBus");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function AdminBusPage() {
  const admin = await requireAdminPage("/admin/bus");
  if (!admin) {
    notFound();
  }

  const [versions, campusCount, routeCount, t, tCommon, tAdmin] =
    await Promise.all([
      prisma.busScheduleVersion.findMany({
        select: {
          id: true,
          key: true,
          title: true,
          isEnabled: true,
          importedAt: true,
          effectiveFrom: true,
          effectiveUntil: true,
          sourceMessage: true,
          _count: { select: { trips: true } },
        },
        orderBy: { importedAt: "desc" },
      }),
      prisma.busCampus.count(),
      prisma.busRoute.count(),
      getTranslations("adminBus"),
      getTranslations("common"),
      getTranslations("admin"),
    ]);

  const activeVersion = versions.find((v) => v.isEnabled);

  return (
    <PageLayout
      title={t("title")}
      description={t("subtitle")}
      breadcrumbs={
        <PageBreadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tAdmin("title"), href: "/admin" },
            { label: t("title") },
          ]}
        />
      }
    >
      <PageStatGrid>
        <PageStatCard label={t("statVersions")} value={versions.length} />
        <PageStatCard
          label={t("statActive")}
          value={activeVersion?.title ?? t("statNone")}
        />
        <PageStatCard label={t("statCampuses")} value={campusCount} />
        <PageStatCard label={t("statRoutes")} value={routeCount} />
      </PageStatGrid>

      <BusVersionManager
        versions={versions.map((v) => ({
          id: v.id,
          key: v.key,
          title: v.title,
          isEnabled: v.isEnabled,
          importedAt: toShanghaiIsoString(v.importedAt),
          effectiveFrom: v.effectiveFrom
            ? toShanghaiIsoString(v.effectiveFrom)
            : null,
          effectiveUntil: v.effectiveUntil
            ? toShanghaiIsoString(v.effectiveUntil)
            : null,
          sourceMessage: v.sourceMessage,
          tripCount: v._count.trips,
        }))}
      />
    </PageLayout>
  );
}
