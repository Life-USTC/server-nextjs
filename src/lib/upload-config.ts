const DEFAULT_UPLOAD_QUOTA_MB = 1024;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const quotaMbRaw = parseInt(process.env.UPLOAD_TOTAL_QUOTA_MB ?? "", 10);
const quotaMb = Number.isNaN(quotaMbRaw) ? DEFAULT_UPLOAD_QUOTA_MB : quotaMbRaw;

export const uploadConfig = {
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  totalQuotaBytes: quotaMb * 1024 * 1024,
};
