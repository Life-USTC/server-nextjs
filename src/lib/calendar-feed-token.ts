import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

function createCalendarFeedToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function ensureUserCalendarFeedToken(
  userId: string,
): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarFeedToken: true },
  });

  if (existing?.calendarFeedToken) {
    return existing.calendarFeedToken;
  }

  const token = createCalendarFeedToken();

  await prisma.user.update({
    where: { id: userId },
    data: { calendarFeedToken: token },
  });

  return token;
}
