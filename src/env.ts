import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_PUBLIC_ORIGIN: z.string().url().optional(),
  APP_CANONICAL_ORIGIN: z.string().url().optional(),
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
  OAUTH_PROXY_SECRET: z.string().optional(),

  // S3 storage (optional outside upload flows)
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ENDPOINT_URL: z.string().optional(),
  AWS_ENDPOINT_URL_S3: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info")
    .optional(),
  WEBHOOK_SECRET: z.string().optional(),
  UPLOAD_TOTAL_QUOTA_MB: z.string().optional(),
  OAUTH_DEBUG_LOGGING: z.string().optional(),
  E2E_DEBUG_AUTH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
export type DevEnv = Partial<Env> & Pick<Env, "NODE_ENV">;

const devEnvSchema = envSchema.partial().extend({
  NODE_ENV: envSchema.shape.NODE_ENV,
});

function formatEnvIssues(issues: z.ZodIssue[]) {
  return issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

function normalizeDevelopmentEnv(input: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== ""),
  );
}

function validateEnv(): Env | DevEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = formatEnvIssues(result.error.issues);

    console.error(`❌ Invalid environment variables:\n${formatted}`);

    if (process.env.NODE_ENV !== "development") {
      throw new Error("Invalid environment variables");
    }

    const devResult = devEnvSchema.safeParse(
      normalizeDevelopmentEnv(process.env),
    );
    if (!devResult.success) {
      throw new Error(
        `Invalid development environment variables:\n${formatEnvIssues(devResult.error.issues)}`,
      );
    }

    return devResult.data;
  }

  return result.data;
}

export const env = validateEnv();
