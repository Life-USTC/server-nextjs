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
import { requireSignedInUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { OAuthClientManager } from "./oauth-client-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oauth");
  return { title: t("adminTitle") };
}

export const dynamic = "force-dynamic";

export default async function AdminOAuthPage() {
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  const [clients, t, tCommon, tAdmin] = await Promise.all([
    prisma.oAuthClient.findMany({
      select: {
        clientId: true,
        name: true,
        tokenEndpointAuthMethod: true,
        redirectUris: true,
        scopes: true,
        grantTypes: true,
        responseTypes: true,
        public: true,
        requirePKCE: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getTranslations("oauth"),
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
            <BreadcrumbPage>{t("adminTitle")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("adminTitle")}</h1>
        <p className="text-muted-foreground text-subtitle">
          {t("adminSubtitle")}
        </p>
      </div>

      <OAuthClientManager
        clients={clients.map((c) => ({
          clientId: c.clientId,
          name: c.name ?? c.clientId,
          tokenEndpointAuthMethod:
            c.tokenEndpointAuthMethod ?? "client_secret_basic",
          redirectUris: c.redirectUris,
          scopes: c.scopes,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
