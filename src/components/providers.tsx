"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="life-ustc-theme"
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
