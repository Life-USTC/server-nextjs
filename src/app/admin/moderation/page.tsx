import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { ModerationDashboard } from "@/components/admin/moderation-dashboard";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return {
    title: t("title"),
  };
}

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
  if (!isAdmin) {
    notFound();
  }

  const t = await getTranslations("moderation");

  return (
    <main className="page-main">
      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ModerationDashboard />
    </main>
  );
}
