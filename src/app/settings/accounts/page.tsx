import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountLinkingSection } from "@/components/account-linking-section";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsAccountsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accounts: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  return <AccountLinkingSection user={user} />;
}
