import { KeyRound, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  PageBreadcrumbs,
  PageLayout,
  PageLinkCard,
  PageLinkGrid,
} from "@/components/page-layout";
import { requireSignedInUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return {
    title: t("title"),
  };
}

export default async function AdminHomePage() {
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  const isAdmin = user?.isAdmin ?? false;
  if (!isAdmin) {
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
      </PageLinkGrid>
    </PageLayout>
  );
}
