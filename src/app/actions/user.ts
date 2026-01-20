"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const username = (formData.get("username") as string)?.trim() || null;
  const image = formData.get("image") as string;

  // Validate username (if provided and non-empty)
  if (username) {
    if (!/^[a-z0-9]{1,20}$/.test(username)) {
      return {
        error:
          "Username must contain only lowercase letters and numbers, max 20 characters",
      };
    }

    // Check uniqueness
    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing && existing.id !== session.user.id) {
      return { error: "Username already taken" };
    }
  }

  try {
    const data: any = {};
    if (name) data.name = name;
    if (username) data.username = username;
    if (image) data.image = image;

    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile" };
  }
}

export async function unlinkAccount(provider: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  try {
    // Count user's accounts to prevent unlinking the last one
    const accountCount = await prisma.account.count({
      where: { userId: session.user.id },
    });

    if (accountCount <= 1) {
      return {
        error:
          "Cannot unlink your only account. You need at least one linked account to sign in.",
      };
    }

    // Find and delete the account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: provider,
      },
    });

    if (!account) {
      return { error: "Account not found" };
    }

    // Delete the account
    await prisma.account.delete({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
    });

    // Optionally delete associated verified emails for this provider
    await prisma.verifiedEmail.deleteMany({
      where: {
        userId: session.user.id,
        provider: provider,
      },
    });

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    console.error("Failed to unlink account:", error);
    return { error: "Failed to unlink account" };
  }
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  try {
    // Delete the user - cascades will handle:
    // - Account (onDelete: Cascade)
    // - Session (onDelete: Cascade)
    // - Authenticator (onDelete: Cascade)
    // - VerifiedEmail (onDelete: Cascade)
    // - CalendarSubscription (onDelete: Cascade)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    // Sign out the user after deleting the account
    await signOut({ redirect: false });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { error: "Failed to delete account" };
  }
}
