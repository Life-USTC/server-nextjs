"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { generateToken } from "@/lib/oauth/utils";

export async function createOAuthClient(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: "Not authorized" };
  }

  const name = (formData.get("name") as string)?.trim();
  const redirectUrisRaw = (formData.get("redirectUris") as string)?.trim();

  if (!name) {
    return { error: "Name is required" };
  }
  if (!redirectUrisRaw) {
    return { error: "At least one redirect URI is required" };
  }

  const redirectUris = redirectUrisRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const uri of redirectUris) {
    try {
      new URL(uri);
    } catch {
      return { error: `Invalid redirect URI: ${uri}` };
    }
  }

  const clientId = generateToken(16);
  const clientSecret = generateToken(32);

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecret,
      name,
      redirectUris,
    },
  });

  revalidatePath("/admin/oauth");

  return { success: true, clientId, clientSecret };
}

export async function deleteOAuthClient(clientDbId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: "Not authorized" };
  }

  await prisma.oAuthClient.delete({ where: { id: clientDbId } });

  revalidatePath("/admin/oauth");
  return { success: true };
}
