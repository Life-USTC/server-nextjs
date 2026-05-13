import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { handleRouteError, unauthorized } from "@/lib/api/helpers";
import { buildSignInRedirectUrl } from "@/lib/auth/auth-routing";
import { prisma } from "@/lib/db/prisma";

type AdminSession = {
  userId: string;
};

async function resolveAdminByUserId(
  userId: string | null | undefined,
): Promise<AdminSession | null> {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });

  if (!user?.isAdmin) {
    return null;
  }

  return { userId: user.id };
}

export async function requireAdmin() {
  const session = await auth();
  return resolveAdminByUserId(session?.user?.id);
}

export async function requireAdminPage(callbackUrl = "/") {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(buildSignInRedirectUrl({}, callbackUrl));
  }

  return resolveAdminByUserId(session.user.id);
}

export async function requireAdminRoute() {
  const admin = await requireAdmin();
  return admin ?? unauthorized();
}

export async function withAdminRoute(
  errorMessage: string,
  handler: (admin: AdminSession) => Promise<Response>,
) {
  const admin = await requireAdminRoute();
  if (admin instanceof Response) {
    return admin;
  }

  try {
    return await handler(admin);
  } catch (error) {
    return handleRouteError(errorMessage, error);
  }
}
