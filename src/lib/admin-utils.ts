import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
  if (!user || !isAdmin) return null;

  return { userId: user.id };
}
