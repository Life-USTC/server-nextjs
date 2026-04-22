import type * as React from "react";
import { cn } from "@/lib/utils";

export function DashboardTabToolbar({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/72 p-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardTabToolbarGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "inline-flex min-w-0 flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-background/80 p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function dashboardTabToolbarItemClass(
  active: boolean,
  className?: string,
) {
  return cn(
    "rounded-lg px-3 py-1.5 text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active
      ? "bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
      : "text-muted-foreground hover:bg-background/90 hover:text-foreground",
    className,
  );
}

export function DashboardTabToolbarMeta({
  className,
  children,
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-xs leading-5 sm:text-right",
        className,
      )}
    >
      {children}
    </p>
  );
}
