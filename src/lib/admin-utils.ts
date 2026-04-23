import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  });

  const isAdmin = user?.isAdmin ?? false;
  if (!user || !isAdmin) return null;

  return { userId: user.id };
}
