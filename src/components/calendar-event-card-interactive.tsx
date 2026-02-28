"use client";

import { useState } from "react";
import {
  CalendarEventCard,
  type CalendarEventVariant,
} from "@/components/calendar-event-card";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@/i18n/routing";

export interface CalendarEventDetail {
  label: string;
  value: string;
}

export interface CalendarEventCardInteractiveProps {
  variant: CalendarEventVariant;
  title: string;
  meta?: string;
  href?: string;
  details?: CalendarEventDetail[];
  className?: string;
}

export function CalendarEventCardInteractive({
  variant,
  title,
  meta,
  href,
  details,
  className,
}: CalendarEventCardInteractiveProps) {
  const [open, setOpen] = useState(false);
  const hasDetails = details && details.length > 0;

  const card = (
    <CalendarEventCard
      variant={variant}
      title={title}
      meta={meta}
      className={className}
    />
  );

  const cardWithLink = href ? (
    <Link
      href={href}
      className="block rounded no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  ) : (
    card
  );

  if (hasDetails) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <div
              onPointerEnter={() => setOpen(true)}
              onPointerLeave={() => setOpen(false)}
            />
          }
        >
          {cardWithLink}
        </PopoverTrigger>
        <PopoverPopup
          side="top"
          align="start"
          className="max-h-64 w-64 overflow-auto"
        >
          <div className="space-y-2">
            <p className="font-medium text-sm">{title}</p>
            <div className="grid gap-1 text-muted-foreground text-xs">
              {details?.map((detail) => (
                <div
                  key={`${detail.label}-${detail.value}`}
                  className="flex items-baseline gap-2"
                >
                  <span className="shrink-0 whitespace-nowrap">
                    {detail.label}
                  </span>
                  <span className="min-w-0 font-medium text-foreground">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PopoverPopup>
      </Popover>
    );
  }

  return cardWithLink;
}
