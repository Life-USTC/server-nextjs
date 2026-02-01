import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { UploadsManager } from "@/components/uploads-manager";
import { prisma } from "@/lib/prisma";
import { uploadConfig } from "@/lib/upload-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.uploads"),
  };
}

export default async function UploadsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const tCommon = await getTranslations("common");
  const tProfile = await getTranslations("profile");
  const tUploads = await getTranslations("uploads");
  const accessUrl = process.env.R2_ACCESS_URL ?? "";

  const now = new Date();
  await prisma.uploadPending.deleteMany({
    where: { userId: session.user.id, expiresAt: { lt: now } },
  });

  const [uploads, usage, pendingUsage] = await Promise.all([
    prisma.upload.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.upload.aggregate({
      where: { userId: session.user.id },
      _sum: { size: true },
    }),
    prisma.uploadPending.aggregate({
      where: { userId: session.user.id, expiresAt: { gt: now } },
      _sum: { size: true },
    }),
  ]);

  const usedBytes = (usage._sum.size ?? 0) + (pendingUsage._sum.size ?? 0);

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/me">{tProfile("title")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tUploads("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{tUploads("title")}</h1>
        <p className="text-muted-foreground text-subtitle">
          {tUploads("description")}
        </p>
      </div>

      <UploadsManager
        initialUploads={uploads.map((upload) => ({
          id: upload.id,
          key: upload.key,
          filename: upload.filename,
          size: upload.size,
          createdAt: upload.createdAt.toISOString(),
        }))}
        initialUsedBytes={usedBytes}
        maxFileSizeBytes={uploadConfig.maxFileSizeBytes}
        quotaBytes={uploadConfig.totalQuotaBytes}
        accessUrl={accessUrl}
      />
    </main>
  );
}
