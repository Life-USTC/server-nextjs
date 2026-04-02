import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageBreadcrumbs, PageLayout } from "@/components/page-layout";
import { SettingsNav } from "@/components/settings-nav";
import { requireSignedInUserId } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSignedInUserId();

  const [tCommon, tSettings] = await Promise.all([
    getTranslations("common"),
    getTranslations("settings"),
  ]);

  return (
    <PageLayout
      title={tSettings("title")}
      description={tSettings("description")}
      headerChildren={<SettingsNav />}
      breadcrumbs={
        <PageBreadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tSettings("title") },
          ]}
        />
      }
    >
      <section className="w-full min-w-0 space-y-5">{children}</section>
    </PageLayout>
  );
}
