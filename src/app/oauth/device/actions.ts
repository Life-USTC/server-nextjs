"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildSignInRedirectUrl } from "@/lib/auth/auth-routing";
import { prisma } from "@/lib/db/prisma";
import { DEVICE_CODE_STATUS, normalizeUserCode } from "@/lib/oauth/device-code";

function buildDeviceCallbackUrl(rawCode: FormDataEntryValue | null) {
  if (typeof rawCode !== "string" || !rawCode.trim()) {
    return "/oauth/device";
  }

  return `/oauth/device?${new URLSearchParams({
    code: rawCode.trim(),
    step: "approve",
  }).toString()}`;
}

export async function approveDeviceCode(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      buildSignInRedirectUrl(
        {},
        buildDeviceCallbackUrl(formData.get("userCode")),
      ),
    );
  }

  const rawCode = formData.get("userCode");
  if (typeof rawCode !== "string" || !rawCode.trim()) {
    redirect("/oauth/device?result=error&reason=missing_code");
  }

  const userCode = normalizeUserCode(rawCode);

  const record = await prisma.deviceCode.findUnique({
    where: { userCode },
  });

  if (
    !record ||
    record.status !== DEVICE_CODE_STATUS.PENDING ||
    record.expiresAt < new Date()
  ) {
    redirect("/oauth/device?result=error&reason=invalid_or_expired");
  }

  await prisma.deviceCode.update({
    where: { id: record.id },
    data: {
      status: DEVICE_CODE_STATUS.APPROVED,
      userId: session.user.id,
    },
  });

  redirect("/oauth/device?result=approved");
}

export async function denyDeviceCode(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      buildSignInRedirectUrl(
        {},
        buildDeviceCallbackUrl(formData.get("userCode")),
      ),
    );
  }

  const rawCode = formData.get("userCode");
  if (typeof rawCode !== "string" || !rawCode.trim()) {
    redirect("/oauth/device?result=error&reason=missing_code");
  }

  const userCode = normalizeUserCode(rawCode);

  const record = await prisma.deviceCode.findUnique({
    where: { userCode },
  });

  if (
    !record ||
    record.status !== DEVICE_CODE_STATUS.PENDING ||
    record.expiresAt < new Date()
  ) {
    redirect("/oauth/device?result=error&reason=invalid_or_expired");
  }

  await prisma.deviceCode.update({
    where: { id: record.id },
    data: { status: DEVICE_CODE_STATUS.DENIED },
  });

  redirect("/oauth/device?result=denied");
}
