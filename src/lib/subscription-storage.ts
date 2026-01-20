/**
 * Calendar subscription state management
 *
 * This module is client-side only. All subscriptions are server-managed
 * and require user authentication.
 */

export interface SubscriptionState {
  subscriptionId: number | null;
  subscriptionToken: string | null;
  subscribedSections: number[];
  isAuthenticated: boolean;
}

const defaultState: SubscriptionState = {
  subscriptionId: null,
  subscriptionToken: null,
  subscribedSections: [],
  isAuthenticated: false,
};

/**
 * Get current subscription state from server
 * Returns default state with isAuthenticated=false if user is not logged in
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  if (typeof window === "undefined") return defaultState;

  try {
    const response = await fetch("/api/calendar-subscriptions/current");

    if (response.status === 401) {
      // User is not logged in
      return { ...defaultState, isAuthenticated: false };
    }

    if (response.ok) {
      const data = await response.json();
      if (data.subscription) {
        return {
          subscriptionId: data.subscription.id,
          subscriptionToken: data.token || null,
          subscribedSections:
            data.subscription.sections?.map((s: { id: number }) => s.id) || [],
          isAuthenticated: true,
        };
      }
      // User is logged in but has no subscription yet
      return { ...defaultState, isAuthenticated: true };
    }

    // Server error (5xx, 4xx other than 401) - throw to distinguish from unauthenticated
    console.error(
      `Unexpected response status ${response.status} from subscription API`,
    );
    throw new Error(`Server error: ${response.status}`);
  } catch (e) {
    console.error("Failed to fetch subscription from server:", e);
    // Re-throw to allow callers to handle the error appropriately
    throw e;
  }
}

/**
 * Create a new subscription with initial sections
 * Requires authentication
 */
export async function createSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const response = await fetch("/api/calendar-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionIds }),
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error("Failed to create subscription");
  }

  const data = await response.json();

  return {
    subscriptionId: data.subscription.id,
    subscriptionToken: data.token,
    subscribedSections: sectionIds,
    isAuthenticated: true,
  };
}

/**
 * Add a section to the current subscription
 * Requires authentication
 */
export async function addSectionToSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const currentState = await getSubscriptionState();

  if (!currentState.isAuthenticated) {
    throw new Error("Authentication required");
  }

  // If section already subscribed, return current state
  if (currentState.subscribedSections.includes(sectionId)) {
    return currentState;
  }

  const newSectionIds = [...currentState.subscribedSections, sectionId];

  // If no subscription exists, create one
  if (!currentState.subscriptionId || !currentState.subscriptionToken) {
    return await createSubscription(newSectionIds);
  }

  // Update existing subscription
  const response = await fetch(
    `/api/calendar-subscriptions/${currentState.subscriptionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentState.subscriptionToken}`,
      },
      body: JSON.stringify({ sectionIds: newSectionIds }),
    },
  );

  if (response.status === 404) {
    // Subscription not found, create a new one
    return await createSubscription(newSectionIds);
  }

  if (!response.ok) {
    throw new Error("Failed to update subscription");
  }

  return {
    ...currentState,
    subscribedSections: newSectionIds,
  };
}

/**
 * Add multiple sections to the current subscription
 * Requires authentication
 */
export async function addSectionsToSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const currentState = await getSubscriptionState();

  if (!currentState.isAuthenticated) {
    throw new Error("Authentication required");
  }

  // Filter out already subscribed sections
  const newSectionIds = [
    ...currentState.subscribedSections,
    ...sectionIds.filter((id) => !currentState.subscribedSections.includes(id)),
  ];

  // If no new sections to add, return current state
  if (newSectionIds.length === currentState.subscribedSections.length) {
    return currentState;
  }

  // If no subscription exists, create one
  if (!currentState.subscriptionId || !currentState.subscriptionToken) {
    return await createSubscription(newSectionIds);
  }

  // Update existing subscription
  const response = await fetch(
    `/api/calendar-subscriptions/${currentState.subscriptionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentState.subscriptionToken}`,
      },
      body: JSON.stringify({ sectionIds: newSectionIds }),
    },
  );

  if (response.status === 404) {
    return await createSubscription(newSectionIds);
  }

  if (!response.ok) {
    throw new Error("Failed to update subscription");
  }

  return {
    ...currentState,
    subscribedSections: newSectionIds,
  };
}

/**
 * Remove a section from the current subscription
 * Requires authentication
 */
export async function removeSectionFromSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const currentState = await getSubscriptionState();

  if (!currentState.isAuthenticated) {
    throw new Error("Authentication required");
  }

  // If section not subscribed, return current state
  if (!currentState.subscribedSections.includes(sectionId)) {
    return currentState;
  }

  const newSectionIds = currentState.subscribedSections.filter(
    (id) => id !== sectionId,
  );

  // If no subscription exists, just return
  if (!currentState.subscriptionId || !currentState.subscriptionToken) {
    return currentState;
  }

  // Update existing subscription
  const response = await fetch(
    `/api/calendar-subscriptions/${currentState.subscriptionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentState.subscriptionToken}`,
      },
      body: JSON.stringify({ sectionIds: newSectionIds }),
    },
  );

  if (response.status === 404) {
    return { ...defaultState, isAuthenticated: true };
  }

  if (!response.ok) {
    throw new Error("Failed to update subscription");
  }

  return {
    ...currentState,
    subscribedSections: newSectionIds,
  };
}

/**
 * Get the subscription ICS URL from state
 */
export function getSubscriptionIcsUrl(state: SubscriptionState): string | null {
  if (!state.subscriptionId || !state.subscriptionToken) {
    return null;
  }

  return `/api/calendar-subscriptions/${state.subscriptionId}/calendar.ics?token=${state.subscriptionToken}`;
}
