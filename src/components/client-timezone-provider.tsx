"use client";

import { createContext, useContext } from "react";
import { APP_TIME_ZONE } from "@/lib/time/parse-date-input";

const ClientTimezoneContext = createContext<string | null>(null);

type ClientTimezoneProviderProps = {
  children: React.ReactNode;
};

export function ClientTimezoneProvider({
  children,
}: ClientTimezoneProviderProps) {
  return (
    <ClientTimezoneContext.Provider value={APP_TIME_ZONE}>
      {children}
    </ClientTimezoneContext.Provider>
  );
}

export function useClientTimezone() {
  return useContext(ClientTimezoneContext);
}
