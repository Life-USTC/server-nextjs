"use client";

import { Calendar, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CalendarButtonProps {
  sectionId: number;
  addToCalendarLabel: string;
  sheetTitle: string;
  sheetDescription: string;
  calendarUrlLabel: string;
  copyLabel: string;
  closeLabel: string;
  learnMoreLabel: string;
}

export function CalendarButton({
  sectionId,
  addToCalendarLabel,
  sheetTitle,
  sheetDescription,
  calendarUrlLabel,
  copyLabel,
  closeLabel,
  learnMoreLabel,
}: CalendarButtonProps) {
  const [copied, setCopied] = useState(false);

  // Construct the full calendar URL (will include locale automatically via next-intl)
  const calendarUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname.split("/sections/")[0]}/sections/${sectionId}/calendar.ics`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" aria-label={addToCalendarLabel} />}
      >
        <Calendar className="h-5 w-5" />
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{sheetTitle}</DialogTitle>
          <DialogDescription>
            {sheetDescription}{" "}
            <a
              href="https://en.wikipedia.org/wiki/ICalendar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {learnMoreLabel}
            </a>
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <div className="space-y-3">
            <label
              htmlFor="calendar-url"
              className="block font-medium text-small"
            >
              {calendarUrlLabel}
            </label>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Disabled"
                disabled
                placeholder={calendarUrl}
                type="url"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                aria-label={copyLabel}
              >
                <Copy className="h-6 w-6" />
                {copied ? "✓" : ""}
              </Button>
            </div>
          </div>
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {closeLabel}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
