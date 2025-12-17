import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.scss";
import "antd/dist/reset.css";

export const metadata: Metadata = {
  title: "Life@USTC",
  description: "USTC course and schedule management system",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Root layout required by Next.js
// The locale-specific layout is in [locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
