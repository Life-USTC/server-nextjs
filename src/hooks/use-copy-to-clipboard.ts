import { useCallback, useEffect, useState } from "react";
import { logClientError } from "@/lib/log/app-logger";

interface UseCopyToClipboardOptions {
  onCopy?: () => void;
  timeout?: number;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { onCopy, timeout = 2000 } = options;
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        onCopy?.();
      } catch (err) {
        logClientError("Failed to copy to clipboard", err, {
          feature: "clipboard",
        });
        setIsCopied(false);
      }
    },
    [onCopy],
  );

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [isCopied, timeout]);

  return { copyToClipboard, isCopied };
}
