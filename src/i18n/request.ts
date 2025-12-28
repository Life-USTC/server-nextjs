import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  // Read locale from the header set by middleware
  const headersList = await headers();
  let locale = headersList.get("x-locale") || routing.defaultLocale;

  // Ensure that a valid locale is used
  if (!routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
