"use server";

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { importBusStaticPayload } from "@/features/bus/lib/bus-import";
import type { BusStaticPayload } from "@/features/bus/lib/bus-types";
import { prisma } from "@/lib/db/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    throw new Error("Not authorized");
  }
  return session.user.id;
}

type ActionResult = { error: string } | { success: true; message?: string };

export async function activateBusVersion(
  versionId: number,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
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
  revalidatePath("/bus");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBusVersion(
  versionId: number,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
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
  try {
    await requireAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  try {
    const cacheDir = path.resolve(process.cwd(), ".cache/life-ustc/static-bus");
    const repoDir = path.join(cacheDir, "static");
    fs.mkdirSync(cacheDir, { recursive: true });

    // Download or update the static repo with sparse-checkout
    if (fs.existsSync(repoDir) && fs.existsSync(path.join(repoDir, ".git"))) {
      execSync(
        "git remote set-url origin https://github.com/Life-USTC/static.git",
        { cwd: repoDir, stdio: "pipe" },
      );
      execSync("git fetch --depth 1 origin master gh-pages", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync("git checkout -B master || git checkout -B gh-pages", {
        cwd: repoDir,
        stdio: "pipe",
        shell: "/bin/sh",
      });
      execSync(
        "git reset --hard origin/master || git reset --hard origin/gh-pages",
        { cwd: repoDir, stdio: "pipe", shell: "/bin/sh" },
      );
      execSync("git sparse-checkout init --cone", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync("git sparse-checkout set static", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync("git checkout", { cwd: repoDir, stdio: "pipe" });
    } else {
      fs.mkdirSync(repoDir, { recursive: true });
      execSync(
        "git clone --no-checkout --depth 1 https://github.com/Life-USTC/static.git .",
        { cwd: repoDir, stdio: "pipe" },
      );
      execSync("git sparse-checkout init --cone", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync("git sparse-checkout set static", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync("git checkout", { cwd: repoDir, stdio: "pipe" });
    }

    // Read the bus payload
    const filePath = path.join(repoDir, "static", "bus_data_v3.json");
    if (!fs.existsSync(filePath)) {
      return { error: `Bus data file not found: ${filePath}` };
    }
    const payload = JSON.parse(
      fs.readFileSync(filePath, "utf-8"),
    ) as BusStaticPayload;

    // Import
    const result = await importBusStaticPayload(prisma, payload);

    revalidatePath("/admin/bus");
    revalidatePath("/bus");
    revalidatePath("/");
    return {
      success: true,
      message: `Imported: ${result.campuses} campuses, ${result.routes} routes, ${result.trips} trips (version: ${result.versionKey})`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Import failed: ${message}` };
  }
}
