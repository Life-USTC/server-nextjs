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

async function extractUploadErrorCode(response: Response) {
  try {
    const data = (await response.json()) as { error?: unknown } | null;
    const error = typeof data?.error === "string" ? data.error : null;
    if (error === "Quota exceeded" || error === "File too large") {
      return error as UploadErrorCode;
    }
    return null;
  } catch {
    return null;
  }
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
    const errorCode = await extractUploadErrorCode(presignResponse);
    throw new UploadFlowError(errorCode ?? "Presign failed");
  }

  const presignData = (await presignResponse.json()) as UploadPresignResponse;

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
    const errorCode = await extractUploadErrorCode(completeResponse);
    throw new UploadFlowError(errorCode ?? "Finalize failed");
  }

  const completeData =
    (await completeResponse.json()) as UploadCompleteResponse<TUpload>;

  const summary: UploadSummary = {
    maxFileSizeBytes: presignData.maxFileSizeBytes,
    quotaBytes: completeData.quotaBytes,
    usedBytes: completeData.usedBytes,
  };

  return { upload: completeData.upload, summary, presign: presignData };
}
