import { apiClient, extractApiErrorMessage } from "@/lib/api-client";

export type UploadSummary = {
  maxFileSizeBytes: number;
  quotaBytes: number;
  usedBytes: number;
};

export type UploadPresignResponse = {
  key: string;
  url: string;
  maxFileSizeBytes: number;
  quotaBytes: number;
  usedBytes: number;
};

export type UploadCompleteResponse<TUpload> = {
  upload: TUpload;
  usedBytes: number;
  quotaBytes: number;
};

export type UploadErrorCode =
  | "Quota exceeded"
  | "File too large"
  | "Presign failed"
  | "Upload failed"
  | "Finalize failed";

export class UploadFlowError extends Error {
  code: UploadErrorCode;

  constructor(code: UploadErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function extractUploadErrorCode(errorBody: unknown): UploadErrorCode | null {
  const error = extractApiErrorMessage(errorBody);
  if (error === "Quota exceeded" || error === "File too large") {
    return error;
  }

  return null;
}

export async function uploadFileWithPresign<TUpload>({
  file,
  maxFileSizeBytes,
}: {
  file: File;
  maxFileSizeBytes?: number;
}): Promise<{
  upload: TUpload;
  summary: UploadSummary;
  presign: UploadPresignResponse;
}> {
  if (maxFileSizeBytes && file.size > maxFileSizeBytes) {
    throw new UploadFlowError("File too large");
  }

  const {
    data: presignData,
    error: presignError,
    response: presignResponse,
  } = await apiClient.POST("/api/uploads", {
    body: {
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  if (!presignResponse.ok || !presignData) {
    const errorCode = extractUploadErrorCode(presignError);
    throw new UploadFlowError(errorCode ?? "Presign failed");
  }

  const uploadResponse = await fetch(presignData.url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!uploadResponse.ok) {
    throw new UploadFlowError("Upload failed");
  }

  const {
    data: completeData,
    error: completeError,
    response: completeResponse,
  } = await apiClient.POST("/api/uploads/complete", {
    body: {
      key: presignData.key,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    },
  });

  if (!completeResponse.ok || !completeData) {
    const errorCode = extractUploadErrorCode(completeError);
    throw new UploadFlowError(errorCode ?? "Finalize failed");
  }

  const summary: UploadSummary = {
    maxFileSizeBytes: presignData.maxFileSizeBytes,
    quotaBytes: completeData.quotaBytes,
    usedBytes: completeData.usedBytes,
  };

  return {
    upload: completeData.upload as TUpload,
    summary,
    presign: presignData,
  };
}
