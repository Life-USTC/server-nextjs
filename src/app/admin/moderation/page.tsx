import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const ModerationDashboard = dynamic(() =>
  import("@/components/admin/moderation-dashboard").then(
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
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  const isAdmin = user?.isAdmin ?? false;
  if (!isAdmin) {
    notFound();
  }

  const [t, tCommon, tAdmin] = await Promise.all([
    getTranslations("moderation"),
    getTranslations("common"),
    getTranslations("admin"),
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
            <BreadcrumbLink href="/admin">{tAdmin("title")}</BreadcrumbLink>
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
      <ModerationDashboard />
    </main>
  );
}
