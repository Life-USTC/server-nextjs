import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { WelcomeForm } from "@/components/welcome-form";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("welcome");
  return { title: t("title") };
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
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
    },
  });

  if (!user) {
    redirect("/signin");
  }

  const params = await searchParams;
  // Determine the safe redirect target
  const nextPath = params.next ? decodeURIComponent(params.next) : "/";
  // Only allow relative paths to prevent open redirects
  const safePath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";

  return <WelcomeForm user={user} nextPath={safePath} />;
}
