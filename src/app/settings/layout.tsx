import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { SettingsNav } from "@/components/settings-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const [tCommon, tSettings] = await Promise.all([
    getTranslations("common"),
    getTranslations("settings"),
  ]);

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tSettings("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{tSettings("title")}</h1>
        <p className="text-muted-foreground text-subtitle">
          {tSettings("description")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <SettingsNav />
        </aside>
        <section className="w-full min-w-0 max-w-5xl space-y-5">
          {children}
        </section>
      </div>
    </main>
  );
}
