import { ProfileEditForm } from "@/components/profile-edit-form";
import { requireSignedInUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function ProfileSettingsSection() {
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      profilePictures: true,
    },
  });

  if (!user) {
    return null;
  }

  return <ProfileEditForm user={user} />;
}
