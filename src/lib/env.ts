// Environment variable validation and typing
interface Env {
  DATABASE_URL: string;
  WEBHOOK_SECRET: string;
  JWT_SECRET: string;

  // CAS3 Configuration
  CAS_CALLBACK_URL: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}

export const env: Env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  CAS_CALLBACK_URL: process.env.CAS_CALLBACK_URL || "",
};

// Validate required environment variables
export function validateEnv(): void {
  const required = [
    "DATABASE_URL",
    "WEBHOOK_SECRET",
    "JWT_SECRET",
    "CAS_CALLBACK_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

// Validate environment variables on startup
validateEnv();
