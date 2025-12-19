import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import NotFoundContent from "@/components/not-found-content";
import { routing } from "@/i18n/routing";

export default async function RootNotFound() {
  // Try to detect locale from URL or headers
  const headersList = await headers();
  const referer = headersList.get("referer") || "";
  const pathname = headersList.get("x-pathname") || "";
  const nextIntlLocale = headersList.get("x-next-intl-locale") || "";
  const cookies = headersList.get("cookie") || "";

  // Try to extract locale from pathname or referer
  let locale = routing.defaultLocale;

  // Check pathname first (might be set by middleware)
  for (const loc of routing.locales) {
    if (pathname.startsWith(`/${loc}`)) {
      locale = loc;
      break;
    }
  }

  // If not found, check the Next-intl locale header
  if (locale === routing.defaultLocale && nextIntlLocale) {
    if (routing.locales.includes(nextIntlLocale)) {
      locale = nextIntlLocale;
    }
  }

  // If not found, check the NEXT_LOCALE cookie
  if (locale === routing.defaultLocale && cookies) {
    const localeMatch = cookies.match(/NEXT_LOCALE=([^;]+)/);
    if (localeMatch) {
      const cookieLocale = localeMatch[1];
      if (routing.locales.includes(cookieLocale)) {
        locale = cookieLocale;
      }
    }
  }

  // If still not found, check referer
  if (locale === routing.defaultLocale) {
    for (const loc of routing.locales) {
      if (referer.includes(`/${loc}/`) || referer.endsWith(`/${loc}`)) {
        locale = loc;
        break;
      }
    }
  }

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <NotFoundContent />
    </NextIntlClientProvider>
  );
}
