"use client";

import { ThemeProvider } from "next-themes";
import { ClientTimezoneProvider } from "@/components/client-timezone-provider";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="life-ustc-theme"
    >
      <ClientTimezoneProvider>{children}</ClientTimezoneProvider>
    </ThemeProvider>
  );
}
