import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type CalendarEventVariant = "session" | "exam" | "homework";

const BASE_STYLES =
  "block max-w-full min-h-[2.75rem] min-w-0 cursor-pointer overflow-hidden px-2 py-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

const VARIANT_STYLES: Record<CalendarEventVariant, string> = {
  session:
    "rounded border border-border/60 bg-muted/20 hover:bg-muted/40 active:bg-muted/50 data-[pressed]:bg-muted/50 data-[open]:bg-muted/50",
  exam: "rounded border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 data-[pressed]:bg-blue-500/30 data-[open]:bg-blue-500/30",
  homework:
    "rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 data-[pressed]:bg-amber-500/30 data-[open]:bg-amber-500/30",
};

export interface CalendarEventCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant: CalendarEventVariant;
  title: string;
  meta?: string;
}

export const CalendarEventCard = forwardRef<
  HTMLDivElement,
  CalendarEventCardProps
>(function CalendarEventCard(
  { variant, title, meta, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(BASE_STYLES, VARIANT_STYLES[variant], className)}
      {...props}
    >
      <p className="min-w-0 truncate font-medium text-sm">{title}</p>
      {meta ? (
        <p className="min-w-0 truncate text-muted-foreground text-xs">{meta}</p>
      ) : (
        <p className="invisible text-muted-foreground text-xs">&#8203;</p>
      )}
    </div>
  );
});
