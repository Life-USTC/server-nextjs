import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { buildSignInRedirectUrl } from "@/lib/auth/auth-routing";
import { findCurrentSemester } from "@/lib/current-semester";
import { prisma } from "@/lib/db/prisma";
import { WelcomeForm } from "./welcome-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("welcome");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(buildSignInRedirectUrl({}, "/welcome"));
  }

  const [user, semesters, currentSemester] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        profilePictures: true,
      },
    }),
    prisma.semester.findMany({
      select: {
        id: true,
        nameCn: true,
      },
      orderBy: {
        jwId: "desc",
      },
      take: 20,
    }),
    findCurrentSemester(prisma.semester, new Date()),
  ]);

  if (!user) {
    redirect(buildSignInRedirectUrl({}, "/welcome"));
  }

  // If profile is already complete, redirect to home
  if (user.name && user.username) {
    redirect("/");
  }

  return (
    <WelcomeForm
      user={user}
      semesters={semesters}
      defaultSemesterId={currentSemester?.id ?? null}
    />
  );
}
