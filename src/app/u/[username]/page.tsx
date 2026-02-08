import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { fetchProfileData } from "../profile-data";
import { ProfileView } from "../profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const p = await params;

  return {
    title: t("pages.userProfile", { username: p.username }),
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const p = await params;
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("publicProfile"),
  ]);

  const username = p.username.trim().toLowerCase();
  if (!username) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    notFound();
  }

  const data = await fetchProfileData(prisma, user.id);
  if (!data) {
    notFound();
  }

  return <ProfileView data={data} locale={locale} t={t} />;
}
