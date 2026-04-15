import { stopS3Server } from "./utils/s3-server";

export default async function globalTeardown() {
  await stopS3Server();
}
