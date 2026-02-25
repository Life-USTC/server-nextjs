import { unlinkSync } from "node:fs";

export default async function globalTeardown() {
  try {
    unlinkSync(".e2e-mock-s3");
  } catch {
    return;
  }
}
