import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsProfilePage() {
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
    redirect("/");
  }

  return <ProfileEditForm user={user} />;
}
