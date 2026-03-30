import type * as React from "react";

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageLayoutProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

function PageLayout({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  headerClassName,
  contentClassName,
  children,
}: PageLayoutProps) {
  const hasHeader = title || description || actions;

  return (
    <main className={cn("page-main flex flex-col gap-6", className)}>
      {breadcrumbs}
      {hasHeader && (
        <header
          className={cn(
            "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
            headerClassName,
          )}
        >
          <div className="space-y-1">
            {title && (
              <h1 className="text-balance text-title-2 md:text-title">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-muted-foreground text-sm md:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}
      <div className={cn("flex flex-col gap-4", contentClassName)}>
        {children}
      </div>
    </main>
  );
}

type PageSectionProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

function PageSection({
  title,
  description,
  actions,
  footer,
  className,
  children,
}: PageSectionProps) {
  const hasHeader = title || description || actions;

  return (
    <Card className={cn("h-full", className)}>
      {hasHeader && (
        <CardHeader>
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardPanel>{children}</CardPanel>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

const Panel = PageSection;

export { PageLayout, PageSection, Panel };
