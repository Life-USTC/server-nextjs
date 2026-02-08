import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

function isSupportedLocale(
  locale: string,
): locale is (typeof routing.locales)[number] {
  return routing.locales.some((supportedLocale) => supportedLocale === locale);
}

export default getRequestConfig(async () => {
  // Read locale from the header set by middleware
  const headersList = await headers();
  let locale = headersList.get("x-locale") || routing.defaultLocale;

  // Ensure that a valid locale is used
  if (!isSupportedLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
