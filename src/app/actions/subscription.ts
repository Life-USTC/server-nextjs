"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { prisma } from "@/lib/db/prisma";

export interface SubscriptionState {
  userId: string | null;
  subscriptionIcsUrl: string | null;
  subscribedSections: number[];
  isAuthenticated: boolean;
}

type AuthenticatedUserWithSections = Prisma.UserGetPayload<{
  select: {
    id: true;
    calendarFeedToken: true;
    subscribedSections: { select: { id: true } };
  };
}>;

async function getAuthenticatedUserWithSections(): Promise<AuthenticatedUserWithSections | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      calendarFeedToken: true,
      subscribedSections: { select: { id: true } },
    },
  });

  return user;
}

/**
 * Get current subscription state from server
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const user = await getAuthenticatedUserWithSections();

  if (!user) {
    return {
      userId: null,
      subscriptionIcsUrl: null,
      subscribedSections: [],
      isAuthenticated: false,
    };
  }

  const calendarFeedToken =
    user.calendarFeedToken ?? (await ensureUserCalendarFeedToken(user.id));

  return {
    userId: user.id,
    subscriptionIcsUrl: buildUserCalendarFeedPath(user.id, calendarFeedToken),
    subscribedSections: user.subscribedSections.map((s) => s.id),
    isAuthenticated: true,
  };
}

/**
 * Add a section to the current user subscription set
 */
export async function addSectionToSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const user = await getAuthenticatedUserWithSections();

  if (!user) {
    throw new Error("Authentication required");
  }

  const currentSectionIds = user.subscribedSections.map((s) => s.id);

  if (!currentSectionIds.includes(sectionId)) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscribedSections: { connect: { id: sectionId } },
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/me/subscriptions/sections");

  return getSubscriptionState();
}

/**
 * Add multiple sections to the current user subscription set
 */
export async function addSectionsToSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const user = await getAuthenticatedUserWithSections();

  if (!user) {
    throw new Error("Authentication required");
  }

  const existingSectionIds = new Set(user.subscribedSections.map((s) => s.id));
  const idsToConnect = sectionIds.filter((id) => !existingSectionIds.has(id));

  if (idsToConnect.length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscribedSections: {
          connect: idsToConnect.map((id) => ({ id })),
        },
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/me/subscriptions/sections");

  return getSubscriptionState();
}

/**
 * Remove a section from the current user subscription set
 */
export async function removeSectionFromSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const user = await getAuthenticatedUserWithSections();

  if (!user) {
    throw new Error("Authentication required");
  }

  const currentSectionIds = user.subscribedSections.map((s) => s.id);

  if (currentSectionIds.includes(sectionId)) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscribedSections: { disconnect: { id: sectionId } },
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/me/subscriptions/sections");

  return getSubscriptionState();
}
