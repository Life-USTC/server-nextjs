import { mkdirSync } from "node:fs";
import { join } from "node:path";
import S3rver from "s3rver";

const S3_PORT = 4569;
const S3_HOST = "127.0.0.1";
const S3_BUCKET = "e2e-test-bucket";
const S3_DIR = join(process.cwd(), ".e2e-s3rver");
const S3_CORS_CONFIG = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

export const e2eS3Config = {
  endpoint: `http://${S3_HOST}:${S3_PORT}`,
  bucket: S3_BUCKET,
  accessKeyId: "S3RVER",
  secretAccessKey: "S3RVER",
  region: "us-east-1",
};

let s3rverInstance: S3rver | null = null;

export async function startS3Server() {
  mkdirSync(join(S3_DIR, S3_BUCKET), { recursive: true });
  s3rverInstance = new S3rver({
    port: S3_PORT,
    address: S3_HOST,
    silent: true,
    directory: S3_DIR,
    configureBuckets: [{ name: S3_BUCKET, configs: [S3_CORS_CONFIG] }],
  });
  await s3rverInstance.run();
  return e2eS3Config;
}

export async function stopS3Server() {
  if (s3rverInstance) {
    await s3rverInstance.close();
    s3rverInstance = null;
  }
}
