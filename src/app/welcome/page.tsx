import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
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
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      profilePictures: true,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  // If profile is already complete, redirect to home
  if (user.name && user.username) {
    redirect("/");
  }

  return <WelcomeForm user={user} />;
}
