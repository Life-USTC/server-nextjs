import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "antd/dist/reset.css";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Life@USTC - Course & Schedule Management",
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
    <html lang="en">
      <body className={`${spaceGrotesk.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
