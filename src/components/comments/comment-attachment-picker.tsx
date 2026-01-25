"use client";

import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import type { CommentViewer } from "@/components/comments/comment-types";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type UploadOption = {
  id: string;
  filename: string;
  size: number;
  url?: string;
};

type UploadSummary = {
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

type CommentAttachmentPickerProps = {
  viewer: CommentViewer;
  uploads: UploadOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  uploadSummary?: UploadSummary | null;
  onUploadComplete?: (upload: UploadOption, summary: UploadSummary) => void;
};

function formatBytes(bytes: number) {
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

export function CommentAttachmentPicker({
  viewer,
  uploads,
  selectedIds,
  onChange,
  uploadSummary,
  onUploadComplete,
}: CommentAttachmentPickerProps) {
  const t = useTranslations("comments");
  const tu = useTranslations("uploads");
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(() => selectedIds.length > 0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo<UploadSummary | null>(() => {
    if (!uploadSummary) return null;
    return {
      maxFileSizeBytes: uploadSummary.maxFileSizeBytes,
      quotaBytes: uploadSummary.quotaBytes,
      usedBytes: uploadSummary.usedBytes,
    };
  }, [uploadSummary]);

  if (!viewer.isAuthenticated) {
    return null;
  }

  const usageLabel = summary
    ? tu("usageLabel", {
        used: formatBytes(summary.usedBytes),
        total: formatBytes(summary.quotaBytes),
      })
    : "";

  const handleUpload = async (file: File) => {
    if (isUploading) return;
    if (summary && file.size > summary.maxFileSizeBytes) {
      toast({
        title: tu("toastFileTooLargeTitle"),
        description: tu("toastFileTooLargeDescription", {
          size: formatBytes(summary.maxFileSizeBytes),
        }),
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
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
          return;
        }
        if (errorCode === "File too large") {
          toast({
            title: tu("toastFileTooLargeTitle"),
            description: tu("toastFileTooLargeDescription", {
              size: formatBytes(summary?.maxFileSizeBytes ?? 0),
            }),
            variant: "destructive",
          });
          return;
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
          return;
        }
        if (errorCode === "File too large") {
          toast({
            title: tu("toastFileTooLargeTitle"),
            description: tu("toastFileTooLargeDescription", {
              size: formatBytes(presignData.maxFileSizeBytes),
            }),
            variant: "destructive",
          });
          return;
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
      onChange(Array.from(new Set([...selectedIds, completeData.upload.id])));
      toast({
        title: tu("toastUploadSuccessTitle"),
        description: tu("toastUploadSuccessDescription", {
          name: completeData.upload.filename,
        }),
        variant: "success",
      });
    } catch (error) {
      console.error("Attachment upload failed", error);
      toast({
        title: tu("toastUploadErrorTitle"),
        description: tu("toastUploadErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedFile(null);
    }
  };

  const toggleAttachment = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <Card
      className={
        isDragActive
          ? "border-dashed border-primary bg-primary/10"
          : "border-dashed bg-muted/20"
      }
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
          void handleUpload(file);
        }
      }}
    >
      <CardPanel className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t("attachmentsToggle", { count: selectedIds.length })}
            </p>
            {summary && (
              <p className="text-xs text-muted-foreground">{usageLabel}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadCloud className="h-4 w-4" />
              {isUploading ? tu("uploading") : tu("uploadAction")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen((value) => !value)}
            >
              {t("attachmentsToggle", { count: selectedIds.length })}
            </Button>
          </div>
        </div>
        {isOpen && (
          <div className="space-y-2">
            {summary && (
              <p className="text-xs text-muted-foreground">
                {tu("fileLimit", {
                  size: formatBytes(summary.maxFileSizeBytes),
                })}
              </p>
            )}
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                {selectedFile.name} · {formatBytes(selectedFile.size)}
              </p>
            )}
            {isDragActive && (
              <p className="text-xs text-muted-foreground">
                {tu("uploadCardDescription")}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {uploads.map((upload) => (
                <Button
                  key={upload.id}
                  variant={
                    selectedIds.includes(upload.id) ? "secondary" : "outline"
                  }
                  size="sm"
                  className="justify-between"
                  onClick={() => toggleAttachment(upload.id)}
                >
                  <span className="truncate">{upload.filename}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(upload.size)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardPanel>
      <Input
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />
    </Card>
  );
}
