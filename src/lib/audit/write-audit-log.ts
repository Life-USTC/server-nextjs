import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export { getAuditRequestMetadata } from "@/lib/audit/request-metadata";

export async function writeAuditLog(params: {
  action: AuditAction;
  userId: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { metadata, ...rest } = params;
  await prisma.auditLog.create({
    data: {
      ...rest,
      ...(metadata !== undefined && {
        metadata: metadata as Prisma.InputJsonValue,
      }),
    },
  });
}
