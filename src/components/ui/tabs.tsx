"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

type TabsVariant = "default" | "underline" | "pill";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "flex flex-col gap-2 data-[orientation=vertical]:flex-row",
        className,
      )}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({
  variant = "default",
  className,
  children,
  ...props
}: TabsPrimitive.List.Props & {
  variant?: TabsVariant;
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        "relative z-0 flex items-center justify-center text-muted-foreground",
        "data-[orientation=vertical]:flex-col",
        variant === "default"
          ? "w-fit gap-x-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72"
          : variant === "underline"
            ? "w-fit gap-x-0.5 data-[orientation=vertical]:px-1 data-[orientation=horizontal]:py-1 *:data-[slot=tabs-trigger]:hover:bg-accent"
            : "flex-wrap items-center justify-start gap-2",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    >
      {children}
      {variant === "pill" ? null : (
        <TabsPrimitive.Indicator
          className={cn(
            "-translate-y-(--active-tab-bottom) absolute bottom-0 left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) transition-[width,translate] duration-200 ease-in-out",
            variant === "underline"
              ? "data-[orientation=vertical]:-translate-x-px z-10 bg-primary data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:w-0.5 data-[orientation=horizontal]:translate-y-px"
              : "-z-1 rounded-md bg-background shadow-sm dark:bg-accent",
          )}
          data-slot="tab-indicator"
        />
      )}
    </TabsPrimitive.List>
  );
}

function TabsTab({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.Tab.Props & { variant?: TabsVariant }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "[&_svg]:-mx-0.5 flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border border-transparent font-medium text-base outline-none transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring data-disabled:pointer-events-none data-disabled:opacity-64 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        variant === "pill"
          ? "gap-2 rounded-full border px-3 py-2 text-sm transition-colors data-active:border-border/80 data-active:bg-card data-active:text-foreground not-data-active:border-transparent not-data-active:text-muted-foreground not-data-active:hover:border-border/60 not-data-active:hover:bg-background/70 not-data-active:hover:text-foreground"
          : "grow gap-1.5 rounded-md hover:text-muted-foreground data-active:text-foreground h-9 px-[calc(--spacing(2.5)-1px)] sm:h-8",
        "data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("flex-1 outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTab,
  TabsTab as TabsTrigger,
  TabsPanel,
  TabsPanel as TabsContent,
};
