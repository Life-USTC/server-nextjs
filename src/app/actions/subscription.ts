"use server";

import { auth } from "@/auth";
import { getUserSectionSubscriptionState } from "@/features/home/server/subscription-read-model";
import {
  addUserSectionSubscriptions,
  removeUserSectionSubscriptions,
} from "@/features/home/server/subscriptions";

export interface SubscriptionState {
  userId: string | null;
  subscriptionIcsUrl: string | null;
  subscribedSections: number[];
  isAuthenticated: boolean;
}

function buildUnauthenticatedState(): SubscriptionState {
  return {
    userId: null,
    subscriptionIcsUrl: null,
    subscribedSections: [],
    isAuthenticated: false,
  };
}

function buildAuthenticatedState(state: {
  userId: string;
  subscriptionIcsUrl: string;
  subscribedSections: number[];
}): SubscriptionState {
  return {
    ...state,
    isAuthenticated: true,
  };
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Get current subscription state from server
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return buildUnauthenticatedState();
  }

  const state = await getUserSectionSubscriptionState(userId);
  return state ? buildAuthenticatedState(state) : buildUnauthenticatedState();
}

/**
 * Add a section to the current user subscription set
 */
export async function addSectionToSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }

  const state = await addUserSectionSubscriptions(userId, [sectionId]);
  if (!state) {
    throw new Error("Authentication required");
  }

  return buildAuthenticatedState(state);
}

/**
 * Add multiple sections to the current user subscription set
 */
export async function addSectionsToSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }

  const state = await addUserSectionSubscriptions(userId, sectionIds);
  if (!state) {
    throw new Error("Authentication required");
  }

  return buildAuthenticatedState(state);
}

/**
 * Remove a section from the current user subscription set
 */
export async function removeSectionFromSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }

  const state = await removeUserSectionSubscriptions(userId, [sectionId]);
  if (!state) {
    throw new Error("Authentication required");
  }

  return buildAuthenticatedState(state);
}
