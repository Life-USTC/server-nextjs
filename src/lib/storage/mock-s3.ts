import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

type StoredObject = {
  body: Uint8Array<ArrayBuffer>;
  contentType: string;
};

type MockS3Store = Map<string, StoredObject>;
type SerializedStoredObject = {
  body: string;
  contentType: string;
};

declare global {
  var __mockS3Store: MockS3Store | undefined;
}

const MOCK_S3_STORE_DIR = join(process.cwd(), ".e2e-mock-s3-store");

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

function ensureMockS3StoreDir() {
  mkdirSync(MOCK_S3_STORE_DIR, { recursive: true });
}

function getMockS3FilePath(key: string) {
  const fileKey = createHash("sha256").update(key, "utf8").digest("hex");
  return join(MOCK_S3_STORE_DIR, `${fileKey}.json`);
}

function serializeStoredObject(object: StoredObject): SerializedStoredObject {
  return {
    body: Buffer.from(object.body).toString("base64"),
    contentType: object.contentType,
  };
}

function deserializeStoredObject(object: SerializedStoredObject): StoredObject {
  return {
    body: Uint8Array.from(Buffer.from(object.body, "base64")),
    contentType: object.contentType,
  };
}

export function putMockS3Object(key: string, object: StoredObject) {
  getMockS3Store().set(key, object);
  ensureMockS3StoreDir();
  writeFileSync(
    getMockS3FilePath(key),
    JSON.stringify(serializeStoredObject(object)),
    "utf8",
  );
}

export function getMockS3Object(key: string) {
  const inMemory = getMockS3Store().get(key);
  if (inMemory) {
    return inMemory;
  }

  const filePath = getMockS3FilePath(key);
  if (!existsSync(filePath)) {
    return undefined;
  }

  const serialized = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as SerializedStoredObject;
  const stored = deserializeStoredObject(serialized);
  getMockS3Store().set(key, stored);
  return stored;
}

export function deleteMockS3Object(key: string) {
  getMockS3Store().delete(key);
  rmSync(getMockS3FilePath(key), { force: true });
}
