"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { generateToken, hashOAuthClientSecret } from "@/lib/oauth/utils";

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
    let parsedUri: URL;
    try {
      parsedUri = new URL(uri);
    } catch {
      return { error: `Invalid redirect URI: ${uri}` };
    }

    const isLocalhost =
      parsedUri.hostname === "localhost" || parsedUri.hostname === "127.0.0.1";
    const isAllowedScheme =
      parsedUri.protocol === "https:" ||
      (parsedUri.protocol === "http:" && isLocalhost);

    if (!isAllowedScheme) {
      return {
        error:
          "Redirect URIs must use https, or http only for localhost/127.0.0.1",
      };
    }
  }

  const clientId = generateToken(16);
  const clientSecret = generateToken(32);
  const hashedClientSecret = await hashOAuthClientSecret(clientSecret);

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecret: hashedClientSecret,
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
