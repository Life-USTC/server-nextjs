"use client";

import { ThemeProvider } from "next-themes";
import { ClientTimezoneProvider } from "@/components/client-timezone-provider";

type ProvidersProps = {
  children: React.ReactNode;
  nonce?: string;
};

export function Providers({ children, nonce }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      nonce={nonce}
      storageKey="life-ustc-theme"
    >
      <ClientTimezoneProvider>{children}</ClientTimezoneProvider>
    </ThemeProvider>
  );
}
