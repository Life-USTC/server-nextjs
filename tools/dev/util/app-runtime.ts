import { existsSync } from "node:fs";
import path from "node:path";

export function resolveAppHost(env: NodeJS.ProcessEnv = process.env) {
  return env.APP_HOST?.trim() || env.HOSTNAME?.trim() || "127.0.0.1";
}

export function resolveAppPort(env: NodeJS.ProcessEnv = process.env) {
  return env.PORT?.trim() || "3000";
}

export function resolveHealthcheckUrl(env: NodeJS.ProcessEnv = process.env) {
  const configuredUrl = env.HEALTHCHECK_URL?.trim();
  return configuredUrl || `http://127.0.0.1:${resolveAppPort(env)}/`;
}

export function resolveStandaloneServerPath(
  root = process.cwd(),
  commandHint = "bun run build",
) {
  const rootServerPath = path.join(root, "server.js");
  if (existsSync(rootServerPath)) {
    return rootServerPath;
  }

  const standaloneServerPath = path.join(
    root,
    ".next",
    "standalone",
    "server.js",
  );
  if (existsSync(standaloneServerPath)) {
    return standaloneServerPath;
  }

  throw new Error(
    `Missing standalone server.js. Run \`${commandHint}\` before starting the standalone app.`,
  );
}
