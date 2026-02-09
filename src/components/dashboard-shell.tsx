import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type DashboardShellProps = {
  homeLabel: string;
  dashboardLabel: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function DashboardShell({
  homeLabel,
  dashboardLabel,
  title,
  description,
  children,
}: DashboardShellProps) {
  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{homeLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{dashboardLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{title}</h1>
        <p className="text-muted-foreground text-subtitle">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <DashboardNav />
        </aside>
        <section className="w-full min-w-0 max-w-5xl space-y-5">
          {children}
        </section>
      </div>
    </main>
  );
}
