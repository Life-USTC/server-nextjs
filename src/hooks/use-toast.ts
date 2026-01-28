// Adapted from Shadcn UI's use-toast hook to work with Base UI's toast manager
// This provides a compatibility layer so we can use the familiar toast({ ... }) API
"use client";

import { useCallback } from "react";
import { toastManager } from "@/components/ui/toast";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
}

export function useToast() {
  const toast = useCallback(
    ({ title, description, variant = "default" }: ToastProps) => {
      // Map shadcn variant names to Base UI toast types if needed
      // The current toast.tsx uses: error, info, loading, success, warning

      let type: "success" | "error" | "warning" | "info" | undefined;

      switch (variant) {
        case "destructive":
          type = "error";
          break;
        case "success":
          type = "success";
          break;
        case "warning":
          type = "warning";
          break;
        case "info":
          type = "info";
          break;
        default:
          type = undefined;
      }

      // Call the Base UI toast manager
      // Note: The structure might need adjustment based on exactly how toastManager is set up in toast.tsx
      // Looking at toast.tsx, it renders title and description from the toast object

      toastManager.add({
        type,
        title,
        description,
      });
    },
    [],
  );

  return { toast };
}
