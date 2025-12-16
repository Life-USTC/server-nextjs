import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";

import "antd/dist/reset.css";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Life@USTC",
  description: "USTC course and schedule management system",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
