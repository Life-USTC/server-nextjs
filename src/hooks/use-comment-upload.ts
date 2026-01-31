import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/format-bytes";
import type { UploadSummary } from "@/lib/upload-client";
import { UploadFlowError, uploadFileWithPresign } from "@/lib/upload-client";

export type UploadOption = {
  id: string;
  filename: string;
  size: number;
  url?: string;
};

export type { UploadSummary };

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
    setIsUploading(true);

    try {
      const { upload, summary } = await uploadFileWithPresign<UploadOption>({
        file,
        maxFileSizeBytes: uploadSummary?.maxFileSizeBytes,
      });

      onUploadComplete?.(upload, summary);

      toast({
        title: tu("toastUploadSuccessTitle"),
        description: tu("toastUploadSuccessDescription", {
          name: upload.filename,
        }),
        variant: "success",
      });

      return upload;
    } catch (error) {
      if (error instanceof UploadFlowError) {
        if (error.code === "Quota exceeded") {
          toast({
            title: tu("toastQuotaExceededTitle"),
            description: tu("toastQuotaExceededDescription"),
            variant: "warning",
          });
          return null;
        }
        if (error.code === "File too large") {
          const maxSize = uploadSummary?.maxFileSizeBytes ?? 0;
          toast({
            title: tu("toastFileTooLargeTitle"),
            description: tu("toastFileTooLargeDescription", {
              size: formatBytes(maxSize),
            }),
            variant: "destructive",
          });
          return null;
        }
      }
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
