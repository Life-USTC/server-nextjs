import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { fetchProfileData } from "../../profile-data";
import { ProfileView } from "../../profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const p = await params;

  return {
    title: t("pages.userProfile", { username: p.uid }),
  };
}

export default async function PublicProfileByIdPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const p = await params;
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("publicProfile"),
  ]);

  const uid = p.uid.trim();
  if (!uid) {
    notFound();
  }

  const data = await fetchProfileData(prisma, uid);
  if (!data) {
    notFound();
  }

  return <ProfileView data={data} locale={locale} t={t} showUserId />;
}
