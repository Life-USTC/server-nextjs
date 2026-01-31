"use client";

import { useCallback, useEffect, useState } from "react";
import type { UploadSummary } from "@/lib/upload-client";

export type UploadOption = {
  id: string;
  filename: string;
  size: number;
  key?: string;
};

export function useUploadsSummary({ enabled }: { enabled: boolean }) {
  const [uploads, setUploads] = useState<UploadOption[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);

  const addUpload = useCallback(
    (upload: UploadOption, nextSummary: UploadSummary) => {
      setUploads((current) => [upload, ...current]);
      setSummary(nextSummary);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setUploads([]);
      setSummary(null);
      return;
    }

    const loadUploads = async () => {
      try {
        const response = await fetch("/api/uploads");
        if (!response.ok) return;
        const data = (await response.json()) as {
          uploads: UploadOption[];
          maxFileSizeBytes: number;
          quotaBytes: number;
          usedBytes: number;
        };
        setUploads(data.uploads ?? []);
        setSummary({
          maxFileSizeBytes: data.maxFileSizeBytes,
          quotaBytes: data.quotaBytes,
          usedBytes: data.usedBytes,
        });
      } catch (error) {
        console.error("Failed to load uploads", error);
      }
    };

    void loadUploads();
  }, [enabled]);

  return { uploads, summary, addUpload };
}
