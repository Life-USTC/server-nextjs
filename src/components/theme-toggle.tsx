"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, systemTheme, setTheme } = useTheme();

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-4 right-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-base bg-surface-elevated shadow-md hover:bg-surface transition-colors focus-ring"
    >
      <span aria-hidden="true" className="text-sm">
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
