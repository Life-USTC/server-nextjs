import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MobileAppIntroPage } from "@/features/home/components/mobile-app-intro-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.mobileApp"),
  };
}

export default function MobileAppPage() {
  return <MobileAppIntroPage />;
}
