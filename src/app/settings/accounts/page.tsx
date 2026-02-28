import { redirect } from "next/navigation";
import { AccountLinkingSection } from "@/components/account-linking-section";
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsAccountsPage() {
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accounts: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  return <AccountLinkingSection user={user} />;
}
