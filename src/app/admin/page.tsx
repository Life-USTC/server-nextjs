import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
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
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return {
    title: t("title"),
  };
}

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
  if (!isAdmin) {
    notFound();
  }

  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");

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
      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/moderation" className="no-underline">
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle>{t("moderationTitle")}</CardTitle>
              <CardDescription>{t("moderationDescription")}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/users" className="no-underline">
          <Card className="hover:bg-accent/50 transition-colors">
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
