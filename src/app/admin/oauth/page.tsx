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

type OAuthClientMetadata = {
  scopes?: unknown;
};

function parseScopes(rawMetadata: string | null) {
  if (!rawMetadata) {
    return ["openid", "profile"];
  }

  try {
    const parsed = JSON.parse(rawMetadata) as OAuthClientMetadata;
    if (!Array.isArray(parsed.scopes)) {
      return ["openid", "profile"];
    }
    const scopes = parsed.scopes.filter(
      (value): value is string => typeof value === "string",
    );
    return scopes.length > 0 ? scopes : ["openid", "profile"];
  } catch {
    return ["openid", "profile"];
  }
}

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
    prisma.oidcApplication.findMany({
      select: {
        id: true,
        clientId: true,
        name: true,
        type: true,
        authenticationScheme: true,
        redirectUrls: true,
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
          id: c.id,
          clientId: c.clientId,
          name: c.name,
          tokenEndpointAuthMethod:
            c.type === "public" ? "none" : c.authenticationScheme,
          redirectUris: c.redirectUrls
            .split(",")
            .map((uri) => uri.trim())
            .filter(Boolean),
          scopes: parseScopes(c.metadata),
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
