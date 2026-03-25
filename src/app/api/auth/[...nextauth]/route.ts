import { handlers } from "@/auth";
import { withBetterAuthOAuthDebug } from "@/lib/log/oauth-debug";

/**
 * Better Auth handlers mounted on /api/auth/*.
 * @ignore
 */
export const GET = (request: Request) =>
  withBetterAuthOAuthDebug("GET", request, handlers.GET);

export const POST = (request: Request) =>
  withBetterAuthOAuthDebug("POST", request, handlers.POST);

export const PATCH = (request: Request) =>
  withBetterAuthOAuthDebug("PATCH", request, handlers.PATCH);

export const PUT = (request: Request) =>
  withBetterAuthOAuthDebug("PUT", request, handlers.PUT);

export const DELETE = (request: Request) =>
  withBetterAuthOAuthDebug("DELETE", request, handlers.DELETE);
