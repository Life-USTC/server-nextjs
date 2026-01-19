"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const image = formData.get("image") as string;

  // Validate username
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
