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
      breadcrumbs={
        <PageBreadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tSettings("title") },
          ]}
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <SettingsNav />
        </aside>
        <section className="w-full min-w-0 space-y-5">{children}</section>
      </div>
    </PageLayout>
  );
}
