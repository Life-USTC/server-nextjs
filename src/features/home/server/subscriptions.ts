import { DEFAULT_LOCALE } from "@/i18n/config";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { getBetterAuthBaseUrl } from "@/lib/mcp/urls";
import { sectionCompactInclude } from "@/lib/query-helpers";

export const SECTION_SUBSCRIPTION_NOTE =
  "Life@USTC section subscriptions only affect your dashboard and calendar here. They are not official USTC course enrollment.";

export async function getUserCalendarSubscription(
  userId: string,
  locale = DEFAULT_LOCALE,
) {
  const localizedPrisma = getPrisma(locale);
  const token = await ensureUserCalendarFeedToken(userId);
  const user = await localizedPrisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      subscribedSections: {
        include: sectionCompactInclude,
        orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
      },
    },
  });

  if (!user) {
    return null;
  }

  const calendarPath = buildUserCalendarFeedPath(user.id, token);

  return {
    userId: user.id,
    sections: user.subscribedSections,
    calendarPath,
    calendarUrl: `${getBetterAuthBaseUrl()}${calendarPath}`,
    note: SECTION_SUBSCRIPTION_NOTE,
  };
}

export async function replaceUserSectionSubscriptions(
  userId: string,
  sectionIds: number[],
  locale = DEFAULT_LOCALE,
) {
  const existingSections = await prisma.section.findMany({
    where: { id: { in: sectionIds } },
    select: { id: true },
  });
  const validSectionIds = existingSections.map((section) => section.id);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscribedSections: {
        set: validSectionIds.map((id) => ({ id })),
      },
    },
  });

  return getUserCalendarSubscription(userId, locale);
}

export async function subscribeUserToSectionByJwId(
  userId: string,
  sectionJwId: number,
  locale = DEFAULT_LOCALE,
) {
  const section = await prisma.section.findUnique({
    where: { jwId: sectionJwId },
    select: { id: true },
  });
  if (!section) {
    return null;
  }

  const existingSections = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscribedSections: {
        select: { id: true },
      },
    },
  });

  if (!existingSections) {
    return null;
  }

  const nextIds = new Set(
    existingSections.subscribedSections.map(({ id }) => id),
  );
  nextIds.add(section.id);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscribedSections: {
        set: Array.from(nextIds).map((id) => ({ id })),
      },
    },
  });

  return getUserCalendarSubscription(userId, locale);
}

export async function unsubscribeUserFromSectionByJwId(
  userId: string,
  sectionJwId: number,
  locale = DEFAULT_LOCALE,
) {
  const existingSections = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscribedSections: {
        select: { id: true, jwId: true },
      },
    },
  });

  if (!existingSections) {
    return null;
  }

  const nextIds = existingSections.subscribedSections
    .filter((section) => section.jwId !== sectionJwId)
    .map((section) => section.id);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscribedSections: {
        set: nextIds.map((id) => ({ id })),
      },
    },
  });

  return getUserCalendarSubscription(userId, locale);
}
