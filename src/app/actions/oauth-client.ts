"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSignedInUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

async function requireAdminUserId() {
  const userId = await requireSignedInUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    throw new Error("Forbidden");
  }
  return userId;
}

export type CreateOAuthClientResult =
  | {
      success: true;
      clientId: string;
      clientSecret: string;
      client: {
        id: string;
        name: string;
        description: string | null;
        clientId: string;
        redirectUris: string[];
        scopes: string[];
        isActive: boolean;
        createdAt: Date;
      };
    }
  | { error: string };

export async function createOAuthClient(
  formData: FormData,
): Promise<CreateOAuthClientResult> {
  try {
    const userId = await requireAdminUserId();

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const redirectUrisRaw = (formData.get("redirectUris") as string)?.trim();
    const scopesRaw = (formData.get("scopes") as string)?.trim();

    if (!name) {
      return { error: "Name is required" };
    }

    const redirectUris = redirectUrisRaw
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (redirectUris.length === 0) {
      return { error: "At least one redirect URI is required" };
    }

    // Validate redirect URIs
    for (const uri of redirectUris) {
      try {
        const parsed = new URL(uri);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return { error: `Invalid redirect URI: ${uri}` };
        }
      } catch {
        return { error: `Invalid redirect URI: ${uri}` };
      }
    }

    const scopes = scopesRaw
      ? scopesRaw
          .split(/[\s,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : ["profile"];

    // clientId: 16 bytes = 128-bit identifier (unique, URL-safe)
    // clientSecret: 32 bytes = 256-bit secret (high entropy, timing-safe compared)
    const clientId = randomBytes(16).toString("base64url");
    const clientSecret = randomBytes(32).toString("base64url");

    const created = await prisma.oAuthClient.create({
      data: {
        name,
        description,
        clientId,
        clientSecret,
        redirectUris,
        scopes,
        createdById: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        clientId: true,
        redirectUris: true,
        scopes: true,
        isActive: true,
        createdAt: true,
      },
    });

    revalidatePath("/admin/oauth");

    return { success: true, clientId, clientSecret, client: created };
  } catch (error) {
    console.error("Failed to create OAuth client:", error);
    return { error: "Failed to create OAuth client" };
  }
}

export async function toggleOAuthClientStatus(
  id: string,
  isActive: boolean,
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUserId();

    await prisma.oAuthClient.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/admin/oauth");
    return { success: true };
  } catch (error) {
    console.error("Failed to update OAuth client:", error);
    return { error: "Failed to update client status" };
  }
}

export async function deleteOAuthClient(
  id: string,
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUserId();

    await prisma.oAuthClient.delete({ where: { id } });

    revalidatePath("/admin/oauth");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete OAuth client:", error);
    return { error: "Failed to delete OAuth client" };
  }
}
