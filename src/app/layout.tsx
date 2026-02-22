import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import BottomBar from "@/components/bottom-bar";
import { Providers } from "@/components/providers";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get messages for the current locale (determined by middleware)
  const [messages, a11yT, locale] = await Promise.all([
    getMessages(),
    getTranslations("accessibility"),
    getLocale(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} antialiased`}>
        <a
          href="#main-content"
          className="sr-only fixed top-4 left-4 z-[60] rounded-md bg-background px-3 py-2 text-sm shadow-sm focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {a11yT("skipToMainContent")}
        </a>
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <ToastProvider>
              <AnchoredToastProvider>
                <div className="flex min-h-screen flex-col">
                  <div className="flex-1">
                    <div
                      id="app-user-menu"
                      className="fixed top-4 right-4 z-50"
                    >
                      <UserMenu />
                    </div>
                    <div id="main-content">{children}</div>
                  </div>
                  <div id="app-bottom-bar">
                    <BottomBar />
                  </div>
                </div>
              </AnchoredToastProvider>
            </ToastProvider>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
