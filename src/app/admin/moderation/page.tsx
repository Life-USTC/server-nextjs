import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs, PageLayout } from "@/components/page-layout";
import { requireAdmin } from "@/lib/admin-utils";

const ModerationDashboard = dynamic(() =>
  import("@/features/admin/components/moderation-dashboard").then(
    (mod) => mod.ModerationDashboard,
  ),
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return {
    title: t("title"),
  };
}

export default async function ModerationPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [t, tCommon, tAdmin] = await Promise.all([
    getTranslations("moderation"),
    getTranslations("common"),
    getTranslations("admin"),
  ]);

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
      <ModerationDashboard />
    </PageLayout>
  );
}
