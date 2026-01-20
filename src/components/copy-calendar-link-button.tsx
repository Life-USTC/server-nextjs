"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";

interface CopyCalendarLinkButtonProps {
  url: string;
  label: string;
  copiedMessage: string;
  copiedDescription: string;
}

export function CopyCalendarLinkButton({
  url,
  label,
  copiedMessage,
  copiedDescription,
}: CopyCalendarLinkButtonProps) {
  const handleClick = async () => {
    const fullUrl = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    toastManager.add({
      title: copiedMessage,
      description: copiedDescription,
      type: "success",
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Calendar className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
