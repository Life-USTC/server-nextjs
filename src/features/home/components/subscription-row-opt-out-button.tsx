"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeSectionFromSubscription } from "@/app/actions/subscription";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";

interface SubscriptionRowOptOutButtonProps {
  sectionId: number;
  label: string;
  confirmLabel: string;
  successLabel: string;
  successDescription: string;
  errorLabel: string;
  retryLabel: string;
}

const CONFIRM_RESET_MS = 4000;

export function SubscriptionRowOptOutButton({
  sectionId,
  label,
  confirmLabel,
  successLabel,
  successDescription,
  errorLabel,
  retryLabel,
}: SubscriptionRowOptOutButtonProps) {
  const router = useRouter();
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const armConfirm = () => {
    setConfirmArmed(true);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(() => {
      setConfirmArmed(false);
      resetTimerRef.current = null;
    }, CONFIRM_RESET_MS);
  };

  const handleClick = () => {
    if (isPending) {
      return;
    }

    if (!confirmArmed) {
      armConfirm();
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    startTransition(async () => {
      try {
        await removeSectionFromSubscription(sectionId);
        setConfirmArmed(false);
        toastManager.add({
          title: successLabel,
          description: successDescription,
          type: "success",
        });
        router.refresh();
      } catch (error) {
        toastManager.add({
          title: errorLabel,
          description: error instanceof Error ? error.message : retryLabel,
          type: "error",
        });
      }
    });
  };

  return (
    <Button
      aria-label={confirmArmed ? confirmLabel : label}
      className="opacity-100 transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover/section-row:pointer-events-auto sm:group-hover/section-row:opacity-100 sm:group-focus-within/section-row:pointer-events-auto sm:group-focus-within/section-row:opacity-100"
      onClick={handleClick}
      size="xs"
      variant={confirmArmed ? "destructive-outline" : "ghost"}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
      <span className="hidden sm:inline">
        {confirmArmed ? confirmLabel : label}
      </span>
    </Button>
  );
}
