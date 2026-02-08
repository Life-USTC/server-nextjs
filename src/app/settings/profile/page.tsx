import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsProfilePage() {
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
    redirect("/dashboard");
  }

  return <ProfileEditForm user={user} />;
}
