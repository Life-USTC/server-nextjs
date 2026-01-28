import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export type UploadOption = {
  id: string;
  filename: string;
  size: number;
  url?: string;
};

export type UploadSummary = {
  maxFileSizeBytes: number;
  quotaBytes: number;
  usedBytes: number;
};

type PresignedResponse = {
  key: string;
  url: string;
  maxFileSizeBytes: number;
  quotaBytes: number;
  usedBytes: number;
};

type CompleteResponse = {
  upload: UploadOption;
  usedBytes: number;
  quotaBytes: number;
};

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

export function useCommentUpload({
  uploadSummary,
  onUploadComplete,
}: {
  uploadSummary?: UploadSummary | null;
  onUploadComplete?: (upload: UploadOption, summary: UploadSummary) => void;
}) {
  const tu = useTranslations("uploads");
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    if (isUploading) return null;
    if (uploadSummary && file.size > uploadSummary.maxFileSizeBytes) {
      toast({
        title: tu("toastFileTooLargeTitle"),
        description: tu("toastFileTooLargeDescription", {
          size: formatBytes(uploadSummary.maxFileSizeBytes),
        }),
        variant: "destructive",
      });
      return null;
    }

    setIsUploading(true);

    try {
      const presignResponse = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const errorPayload = await presignResponse.json().catch(() => null);
        const errorCode = errorPayload?.error;
        if (errorCode === "Quota exceeded") {
          toast({
            title: tu("toastQuotaExceededTitle"),
            description: tu("toastQuotaExceededDescription"),
            variant: "warning",
          });
          return null;
        }
        if (errorCode === "File too large") {
          toast({
            title: tu("toastFileTooLargeTitle"),
            description: tu("toastFileTooLargeDescription", {
              size: formatBytes(uploadSummary?.maxFileSizeBytes ?? 0),
            }),
            variant: "destructive",
          });
          return null;
        }
        throw new Error("Presign failed");
      }

      const presignData = (await presignResponse.json()) as PresignedResponse;

      const uploadResponse = await fetch(presignData.url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presignData.key,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!completeResponse.ok) {
        const errorPayload = await completeResponse.json().catch(() => null);
        const errorCode = errorPayload?.error;
        if (errorCode === "Quota exceeded") {
          toast({
            title: tu("toastQuotaExceededTitle"),
            description: tu("toastQuotaExceededDescription"),
            variant: "warning",
          });
          return null;
        }
        if (errorCode === "File too large") {
          toast({
            title: tu("toastFileTooLargeTitle"),
            description: tu("toastFileTooLargeDescription", {
              size: formatBytes(presignData.maxFileSizeBytes),
            }),
            variant: "destructive",
          });
          return null;
        }
        throw new Error("Finalize failed");
      }

      const completeData = (await completeResponse.json()) as CompleteResponse;
      const nextSummary: UploadSummary = {
        maxFileSizeBytes: presignData.maxFileSizeBytes,
        quotaBytes: completeData.quotaBytes,
        usedBytes: completeData.usedBytes,
      };

      onUploadComplete?.(completeData.upload, nextSummary);

      toast({
        title: tu("toastUploadSuccessTitle"),
        description: tu("toastUploadSuccessDescription", {
          name: completeData.upload.filename,
        }),
        variant: "success",
      });

      return completeData.upload;
    } catch (error) {
      console.error("Attachment upload failed", error);
      toast({
        title: tu("toastUploadErrorTitle"),
        description: tu("toastUploadErrorDescription"),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
