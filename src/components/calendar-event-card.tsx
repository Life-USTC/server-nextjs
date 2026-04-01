import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type CalendarEventVariant = "session" | "exam" | "homework" | "todo";

const META_SEP = " · ";

function resolveSubtitleLines(
  time: string | undefined,
  location: string | undefined,
  meta: string | undefined,
): { line1: string; line2: string | undefined } {
  const explicit = time !== undefined || location !== undefined;
  if (explicit) {
    const line1 = time?.trim() ?? "";
    const line2 = location?.trim() || undefined;
    return { line1, line2 };
  }
  if (meta?.trim()) {
    const m = meta.trim();
    const i = m.indexOf(META_SEP);
    if (i !== -1) {
      const line1 = m.slice(0, i).trim();
      // By default, the card should not expose the location/address line.
      // Keep the first segment (usually time) and leave the rest for popovers.
      return { line1, line2: undefined };
    }
    return { line1: m, line2: undefined };
  }
  return { line1: "", line2: undefined };
}

const BASE_STYLES =
  "block max-w-full min-h-[2.75rem] min-w-0 cursor-pointer overflow-hidden px-2 py-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

const VARIANT_STYLES: Record<CalendarEventVariant, string> = {
  session:
    "rounded-lg border border-border/70 bg-card/88 hover:bg-background active:bg-card data-[pressed]:bg-card data-[open]:bg-card",
  exam: "rounded-lg border border-blue-500/35 bg-blue-500/[0.08] hover:bg-blue-500/[0.14] active:bg-blue-500/[0.18] data-[pressed]:bg-blue-500/[0.18] data-[open]:bg-blue-500/[0.18]",
  homework:
    "rounded-lg border border-amber-500/35 bg-amber-500/[0.08] hover:bg-amber-500/[0.14] active:bg-amber-500/[0.18] data-[pressed]:bg-amber-500/[0.18] data-[open]:bg-amber-500/[0.18]",
  todo: "rounded-lg border border-violet-500/35 bg-violet-500/[0.08] hover:bg-violet-500/[0.14] active:bg-violet-500/[0.18] data-[pressed]:bg-violet-500/[0.18] data-[open]:bg-violet-500/[0.18]",
};

/** Hover popover: solid (opaque) background, variant-tinted. */
export const calendarEventVariantPopoverClassName: Record<
  CalendarEventVariant,
  string
> = {
  session: "!border-border/70 !bg-popover !text-foreground",
  exam: "!border-blue-500/35 !bg-blue-50/95 dark:!bg-blue-950/95 !text-foreground",
  homework:
    "!border-amber-500/35 !bg-amber-50/95 dark:!bg-amber-950/95 !text-foreground",
  todo: "!border-violet-500/35 !bg-violet-50/95 dark:!bg-violet-950/95 !text-foreground",
};

export interface CalendarEventCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant: CalendarEventVariant;
  title: string;
  /** First subtitle line (e.g. time). Takes precedence over parsing `meta`. */
  time?: string;
  /** Second subtitle line (e.g. location). Only shown when non-empty. */
  location?: string;
  /** Combined meta; split on first " · " into time + location when `time`/`location` omitted. */
  meta?: string;
}

export const CalendarEventCard = forwardRef<
  HTMLDivElement,
  CalendarEventCardProps
>(function CalendarEventCard(
  { variant, title, time, location, meta, className, ...props },
  ref,
) {
  const { line1, line2 } = resolveSubtitleLines(time, location, meta);
  const hasSubtitle = Boolean(line1 || line2);

  return (
    <div
      ref={ref}
      className={cn(BASE_STYLES, VARIANT_STYLES[variant], className)}
      {...props}
    >
      <p className="min-w-0 truncate font-medium text-sm leading-tight">
        {title}
      </p>
      <div className="min-w-0 space-y-0.5">
        {line1 ? (
          <p className="min-w-0 truncate text-muted-foreground text-xs leading-tight">
            {line1}
          </p>
        ) : null}
        {line2 ? (
          <p className="min-w-0 truncate text-muted-foreground text-xs leading-tight">
            {line2}
          </p>
        ) : null}
        {!hasSubtitle ? (
          <p className="invisible text-xs leading-tight">&#8203;</p>
        ) : null}
      </div>
    </div>
  );
});
