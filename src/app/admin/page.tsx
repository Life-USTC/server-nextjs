import type { Metadata } from "next";
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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
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

  const [
    t,
    tCommon,
    totalUsers,
    activeSuspensions,
    softbannedComments,
    deletedComments,
  ] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
    prisma.user.count(),
    prisma.userSuspension.count({ where: { liftedAt: null } }),
    prisma.comment.count({ where: { status: "softbanned" } }),
    prisma.comment.count({ where: { status: "deleted" } }),
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

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statsTotalUsers")}</CardDescription>
            <CardTitle className="text-3xl">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statsActiveSuspensions")}</CardDescription>
            <CardTitle className="text-3xl">{activeSuspensions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statsSoftbannedComments")}</CardDescription>
            <CardTitle className="text-3xl">{softbannedComments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statsDeletedComments")}</CardDescription>
            <CardTitle className="text-3xl">{deletedComments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link href="/admin/moderation" className="no-underline">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader>
              <CardTitle>{t("moderationTitle")}</CardTitle>
              <CardDescription>{t("moderationDescription")}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/users" className="no-underline">
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader>
              <CardTitle>{t("usersTitle")}</CardTitle>
              <CardDescription>{t("usersDescription")}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
