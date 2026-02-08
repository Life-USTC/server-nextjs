"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export interface SubscriptionState {
  subscriptionId: number | null;
  subscriptionToken: string | null;
  subscribedSections: number[];
  isAuthenticated: boolean;
}

/**
 * Get current subscription state from server
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      subscriptionId: null,
      subscriptionToken: null,
      subscribedSections: [],
      isAuthenticated: false,
    };
  }

  const subscription = await prisma.calendarSubscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { id: "desc" },
    include: { sections: { select: { id: true } } },
  });

  if (!subscription) {
    return {
      subscriptionId: null,
      subscriptionToken: null,
      subscribedSections: [],
      isAuthenticated: true,
    };
  }

  const token = await generateCalendarSubscriptionJWT(subscription.id);

  return {
    subscriptionId: subscription.id,
    subscriptionToken: token,
    subscribedSections: subscription.sections.map((s) => s.id),
    isAuthenticated: true,
  };
}

/**
 * Add a section to the current subscription
 */
export async function addSectionToSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Find or create subscription for user
  let subscription = await prisma.calendarSubscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { id: "desc" },
    include: { sections: { select: { id: true } } },
  });

  const currentSectionIds = subscription?.sections.map((s) => s.id) || [];

  // If section already subscribed, return current state
  if (currentSectionIds.includes(sectionId)) {
    const token = subscription
      ? await generateCalendarSubscriptionJWT(subscription.id)
      : null;
    return {
      subscriptionId: subscription?.id || null,
      subscriptionToken: token,
      subscribedSections: currentSectionIds,
      isAuthenticated: true,
    };
  }

  const newSectionIds = [...currentSectionIds, sectionId];

  if (!subscription) {
    // Create new subscription
    subscription = await prisma.calendarSubscription.create({
      data: {
        userId: session.user.id,
        sections: { connect: newSectionIds.map((id) => ({ id })) },
      },
      include: { sections: { select: { id: true } } },
    });
  } else {
    // Update existing subscription
    subscription = await prisma.calendarSubscription.update({
      where: { id: subscription.id },
      data: {
        sections: { set: newSectionIds.map((id) => ({ id })) },
      },
      include: { sections: { select: { id: true } } },
    });
  }

  const token = await generateCalendarSubscriptionJWT(subscription.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/homeworks");
  revalidatePath("/dashboard/subscriptions/sections");
  revalidatePath("/me/subscriptions/sections");

  return {
    subscriptionId: subscription.id,
    subscriptionToken: token,
    subscribedSections: subscription.sections.map((s) => s.id),
    isAuthenticated: true,
  };
}

/**
 * Add multiple sections to the current subscription
 */
export async function addSectionsToSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Find or create subscription for user
  let subscription = await prisma.calendarSubscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { id: "desc" },
    include: { sections: { select: { id: true } } },
  });

  const currentSectionIds = subscription?.sections.map((s) => s.id) || [];

  // Filter out already subscribed sections
  const newSectionIds = [
    ...currentSectionIds,
    ...sectionIds.filter((id) => !currentSectionIds.includes(id)),
  ];

  // If no new sections to add, return current state
  if (newSectionIds.length === currentSectionIds.length) {
    const token = subscription
      ? await generateCalendarSubscriptionJWT(subscription.id)
      : null;
    return {
      subscriptionId: subscription?.id || null,
      subscriptionToken: token,
      subscribedSections: currentSectionIds,
      isAuthenticated: true,
    };
  }

  if (!subscription) {
    // Create new subscription
    subscription = await prisma.calendarSubscription.create({
      data: {
        userId: session.user.id,
        sections: { connect: newSectionIds.map((id) => ({ id })) },
      },
      include: { sections: { select: { id: true } } },
    });
  } else {
    // Update existing subscription
    subscription = await prisma.calendarSubscription.update({
      where: { id: subscription.id },
      data: {
        sections: { set: newSectionIds.map((id) => ({ id })) },
      },
      include: { sections: { select: { id: true } } },
    });
  }

  const token = await generateCalendarSubscriptionJWT(subscription.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/homeworks");
  revalidatePath("/dashboard/subscriptions/sections");
  revalidatePath("/me/subscriptions/sections");

  return {
    subscriptionId: subscription.id,
    subscriptionToken: token,
    subscribedSections: subscription.sections.map((s) => s.id),
    isAuthenticated: true,
  };
}

/**
 * Remove a section from the current subscription
 */
export async function removeSectionFromSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  const subscription = await prisma.calendarSubscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { id: "desc" },
    include: { sections: { select: { id: true } } },
  });

  if (!subscription) {
    return {
      subscriptionId: null,
      subscriptionToken: null,
      subscribedSections: [],
      isAuthenticated: true,
    };
  }

  const currentSectionIds = subscription.sections.map((s) => s.id);

  // If section not subscribed, return current state
  if (!currentSectionIds.includes(sectionId)) {
    const token = await generateCalendarSubscriptionJWT(subscription.id);
    return {
      subscriptionId: subscription.id,
      subscriptionToken: token,
      subscribedSections: currentSectionIds,
      isAuthenticated: true,
    };
  }

  const newSectionIds = currentSectionIds.filter((id) => id !== sectionId);

  const updatedSubscription = await prisma.calendarSubscription.update({
    where: { id: subscription.id },
    data: {
      sections: { set: newSectionIds.map((id) => ({ id })) },
    },
    include: { sections: { select: { id: true } } },
  });

  const token = await generateCalendarSubscriptionJWT(updatedSubscription.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/homeworks");
  revalidatePath("/dashboard/subscriptions/sections");
  revalidatePath("/me/subscriptions/sections");

  return {
    subscriptionId: updatedSubscription.id,
    subscriptionToken: token,
    subscribedSections: updatedSubscription.sections.map((s) => s.id),
    isAuthenticated: true,
  };
}
