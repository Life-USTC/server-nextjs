import { existsSync } from "node:fs";
import { join } from "node:path";

type StoredObject = {
  body: Uint8Array<ArrayBuffer>;
  contentType: string;
};

type MockS3Store = Map<string, StoredObject>;

declare global {
  var __mockS3Store: MockS3Store | undefined;
}

export function isMockS3Enabled() {
  if (process.env.E2E_MOCK_S3 === "1") {
    return true;
  }
  return existsSync(join(process.cwd(), ".e2e-mock-s3"));
}

export function getMockS3Store(): MockS3Store {
  if (!globalThis.__mockS3Store) {
    globalThis.__mockS3Store = new Map();
  }
  return globalThis.__mockS3Store;
}

export function putMockS3Object(key: string, object: StoredObject) {
  getMockS3Store().set(key, object);
}

export function getMockS3Object(key: string) {
  return getMockS3Store().get(key);
}

export function deleteMockS3Object(key: string) {
  getMockS3Store().delete(key);
}
