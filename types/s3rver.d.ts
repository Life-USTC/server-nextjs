declare module "s3rver" {
  type BucketConfig = {
    name: string;
    configs?: Array<string | Buffer>;
  };

  type S3rverOptions = {
    address?: string;
    port?: number;
    silent?: boolean;
    serviceEndpoint?: string;
    directory?: string;
    resetOnClose?: boolean;
    allowMismatchedSignatures?: boolean;
    vhostBuckets?: boolean;
    configureBuckets?: BucketConfig[];
  };

  export default class S3rver {
    constructor(options?: S3rverOptions);
    run(): Promise<unknown>;
    close(): Promise<void>;
  }
}
