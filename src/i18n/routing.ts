import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { APP_LOCALES, DEFAULT_LOCALE } from "./config";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: [...APP_LOCALES],

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE,

  // Don't use locale prefix in URL
  localePrefix: "never",
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
