"use client";

import { createContext, useContext, useMemo } from "react";

const ClientTimezoneContext = createContext<string | null>(null);

type ClientTimezoneProviderProps = {
  children: React.ReactNode;
};

export function ClientTimezoneProvider({
  children,
}: ClientTimezoneProviderProps) {
  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      return null;
    }
  }, []);

  return (
    <ClientTimezoneContext.Provider value={timeZone}>
      {children}
    </ClientTimezoneContext.Provider>
  );
}

export function useClientTimezone() {
  return useContext(ClientTimezoneContext);
}
