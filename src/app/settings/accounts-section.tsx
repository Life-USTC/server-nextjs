import { AccountLinkingSection } from "@/components/account-linking-section";
import { requireSignedInUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function AccountSettingsSection() {
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
    return null;
  }

  return <AccountLinkingSection user={user} />;
}
