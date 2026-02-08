"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SearchHelpSheetProps {
  trigger: string;
  title: string;
  description: string;
  exampleLabel: string;
  examples: Array<{
    syntax: string;
    description: string;
    example: string;
  }>;
}

export function SearchHelpSheet({
  trigger,
  title,
  description,
  exampleLabel,
  examples,
}: SearchHelpSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="default" />}>
        {trigger}
      </SheetTrigger>
      <SheetPopup>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <div className="space-y-10">
            {examples.map((item) => (
              <div key={item.syntax} className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-small">
                    {item.syntax}
                  </code>
                </div>
                <div className="ml-6 space-y-2">
                  <p className="text-body text-muted-foreground">
                    {item.description}
                  </p>
                  {item.example && (
                    <p className="text-foreground text-small">
                      <strong>{exampleLabel}</strong>{" "}
                      <code className="rounded bg-muted px-1 font-mono">
                        {item.example}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
