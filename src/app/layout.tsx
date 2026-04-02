import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AppLogo } from "@/components/app-logo";
import BottomBar from "@/components/bottom-bar";
import { Providers } from "@/components/providers";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans-fallback",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
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
  // Get messages for the current locale (cookie / Accept-Language via src/proxy.ts)
  const [messages, a11yT, locale, session] = await Promise.all([
    getMessages(),
    getTranslations("accessibility"),
    getLocale(),
    auth(),
  ]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${notoSansSc.variable} ${jetBrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
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
                    <div className="scroll-mt-4" id="main-content">
                      <div
                        id="app-brand-row"
                        className="page-main pointer-events-none relative z-10 flex items-start justify-between gap-4 pt-4 pb-0 md:pt-5 lg:pt-6"
                      >
                        <div className="pointer-events-auto" id="app-logo">
                          <AppLogo />
                        </div>
                        {session?.user ? (
                          <div
                            className="pointer-events-auto"
                            id="app-user-menu"
                          >
                            <UserMenu
                              initialUser={{
                                id: session.user.id,
                                name: session.user.name ?? null,
                                image: session.user.image ?? null,
                                username:
                                  typeof session.user.username === "string"
                                    ? session.user.username
                                    : null,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                      {children}
                    </div>
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
