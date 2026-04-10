import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),

  // OAuth providers (optional)
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_OIDC_ISSUER: z.string().optional(),
  AUTH_OIDC_CLIENT_ID: z.string().optional(),
  AUTH_OIDC_CLIENT_SECRET: z.string().optional(),

  // S3/R2 storage (optional)
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ACCESS_URL: z.string().optional(),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  WEBHOOK_SECRET: z.string().optional(),
  UPLOAD_TOTAL_QUOTA_MB: z.string().optional(),
  OAUTH_DEBUG_LOGGING: z.string().optional(),
  E2E_DEBUG_AUTH: z.string().optional(),
  E2E_MOCK_S3: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error(`❌ Invalid environment variables:\n${formatted}`);

    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
  }

  return result.success ? result.data : (process.env as unknown as Env);
}

export const env = validateEnv();
