/**
 * LocalStorage utility for managing calendar subscription state
 */

const STORAGE_KEY = "calendarSubscription";

export interface SubscriptionState {
  subscriptionId: number | null;
  subscriptionToken: string | null;
  subscribedSections: number[];
}

const defaultState: SubscriptionState = {
  subscriptionId: null,
  subscriptionToken: null,
  subscribedSections: [],
};

/**
 * Get current subscription state from localStorage
 */
export function getSubscriptionState(): SubscriptionState {
  if (typeof window === "undefined") return defaultState;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;

    const parsed = JSON.parse(stored) as SubscriptionState;
    return {
      subscriptionId: parsed.subscriptionId ?? null,
      subscriptionToken: parsed.subscriptionToken ?? null,
      subscribedSections: Array.isArray(parsed.subscribedSections)
        ? parsed.subscribedSections
        : [],
    };
  } catch {
    return defaultState;
  }
}

/**
 * Save subscription state to localStorage
 */
function saveSubscriptionState(state: SubscriptionState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save subscription state:", error);
  }
}

/**
 * Create a new subscription with initial sections
 */
export async function createSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const response = await fetch("/api/calendar-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to create subscription");
  }

  const data = await response.json();

  const newState: SubscriptionState = {
    subscriptionId: data.subscription.id,
    subscriptionToken: data.token,
    subscribedSections: sectionIds,
  };

  saveSubscriptionState(newState);
  return newState;
}

/**
 * Add a section to the current subscription
 */
export async function addSectionToSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const currentState = getSubscriptionState();

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

  if (!response.ok) {
    throw new Error("Failed to update subscription");
  }

  const newState: SubscriptionState = {
    ...currentState,
    subscribedSections: newSectionIds,
  };

  saveSubscriptionState(newState);
  return newState;
}

/**
 * Add multiple sections to the current subscription
 */
export async function addSectionsToSubscription(
  sectionIds: number[],
): Promise<SubscriptionState> {
  const currentState = getSubscriptionState();

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

  if (!response.ok) {
    throw new Error("Failed to update subscription");
  }

  const newState: SubscriptionState = {
    ...currentState,
    subscribedSections: newSectionIds,
  };

  saveSubscriptionState(newState);
  return newState;
}

/**
 * Remove a section from the current subscription
 */
export async function removeSectionFromSubscription(
  sectionId: number,
): Promise<SubscriptionState> {
  const currentState = getSubscriptionState();

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

  if (!response.ok) {
    throw new Error("Failed to update subscription");
  }

  const newState: SubscriptionState = {
    ...currentState,
    subscribedSections: newSectionIds,
  };

  saveSubscriptionState(newState);
  return newState;
}

/**
 * Check if a section is currently subscribed
 */
export function isSectionSubscribed(sectionId: number): boolean {
  const state = getSubscriptionState();
  return state.subscribedSections.includes(sectionId);
}

/**
 * Get the subscription ICS URL
 */
export function getSubscriptionIcsUrl(): string | null {
  const state = getSubscriptionState();

  if (!state.subscriptionId || !state.subscriptionToken) {
    return null;
  }

  return `/api/calendar-subscriptions/${state.subscriptionId}/calendar.ics?token=${state.subscriptionToken}`;
}

/**
 * Clear subscription state (logout/reset)
 */
export function clearSubscriptionState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
