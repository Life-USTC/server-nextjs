import { Bus, KeyRound, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  PageBreadcrumbs,
  PageLayout,
  PageLinkCard,
  PageLinkGrid,
} from "@/components/page-layout";
import { requireAdminPage } from "@/lib/admin-utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return {
    title: t("title"),
  };
}

export default async function AdminHomePage() {
  const admin = await requireAdminPage("/admin");
  if (!admin) {
    notFound();
  }

  const [t, tCommon] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
  ]);

  return (
    <PageLayout
      title={t("title")}
      description={t("subtitle")}
      breadcrumbs={
        <PageBreadcrumbs
          items={[{ label: tCommon("home"), href: "/" }, { label: t("title") }]}
        />
      }
    >
      <PageLinkGrid>
        <PageLinkCard
          href="/admin/moderation"
          icon={Shield}
          title={t("moderationTitle")}
          description={t("moderationDescription")}
        />
        <PageLinkCard
          href="/admin/users"
          icon={Users}
          title={t("usersTitle")}
          description={t("usersDescription")}
        />
        <PageLinkCard
          href="/admin/oauth"
          icon={KeyRound}
          title={t("oauthTitle")}
          description={t("oauthDescription")}
        />
        <PageLinkCard
          href="/admin/bus"
          icon={Bus}
          title={t("busTitle")}
          description={t("busDescription")}
        />
      </PageLinkGrid>
    </PageLayout>
  );
}
