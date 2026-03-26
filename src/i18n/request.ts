import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isAppLocale } from "./config";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  // Read locale from the header set by src/proxy.ts (edge)
  const headersList = await headers();
  let locale = headersList.get("x-locale") || routing.defaultLocale;

  if (!isAppLocale(locale)) {
    locale = DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
