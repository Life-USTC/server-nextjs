"use server";

import { revalidatePath } from "next/cache";
import { importBusStaticPayload } from "@/features/bus/lib/bus-import";
import { loadBusStaticPayload } from "@/features/bus/lib/bus-static-source";
import { requireAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/db/prisma";

type ActionResult = { error: string } | { success: true; message?: string };

export async function activateBusVersion(
  versionId: number,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Not authorized" };
  }

  const version = await prisma.busScheduleVersion.findUnique({
    where: { id: versionId },
    select: { id: true },
  });
  if (!version) {
    return { error: "Version not found" };
  }

  // Disable all other versions, enable this one
  await prisma.$transaction([
    prisma.busScheduleVersion.updateMany({
      where: { id: { not: versionId } },
      data: { isEnabled: false },
    }),
    prisma.busScheduleVersion.update({
      where: { id: versionId },
      data: { isEnabled: true },
    }),
  ]);

  revalidatePath("/admin/bus");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBusVersion(
  versionId: number,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Not authorized" };
  }

  const version = await prisma.busScheduleVersion.findUnique({
    where: { id: versionId },
    select: { id: true, isEnabled: true },
  });
  if (!version) {
    return { error: "Version not found" };
  }
  if (version.isEnabled) {
    return { error: "Cannot delete the active version" };
  }

  await prisma.busScheduleVersion.delete({ where: { id: versionId } });

  revalidatePath("/admin/bus");
  return { success: true };
}

export async function triggerBusImport(): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Not authorized" };
  }

  try {
    const payload = await loadBusStaticPayload();

    // Import
    const result = await importBusStaticPayload(prisma, payload);

    revalidatePath("/admin/bus");
    revalidatePath("/");
    return {
      success: true,
      message: `Imported: ${result.campuses} campuses, ${result.routes} routes, ${result.trips} trips from published static data (version: ${result.versionKey})`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Import failed: ${message}` };
  }
}
