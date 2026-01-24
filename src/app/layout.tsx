import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import BottomBar from "@/components/bottom-bar";
import { Providers } from "@/components/providers";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
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
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} antialiased`}>
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <ToastProvider>
              <AnchoredToastProvider>
                <div className="flex flex-col min-h-screen">
                  <div className="flex-1">{children}</div>
                  <BottomBar />
                </div>
              </AnchoredToastProvider>
            </ToastProvider>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
