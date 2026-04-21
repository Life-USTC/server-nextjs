import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";
import { prisma } from "@/lib/db/prisma";
import { logOAuthDebug } from "@/lib/log/oauth-debug";

const webhookLoginBodySchema = z.object({
  secret: z.string().optional(),
  email: z.string().optional(),
  userId: z.string().optional(),
});

export function webhookLoginPlugin() {
  return {
    id: "life-webhook-login",
    endpoints: {
      webhookLogin: createAuthEndpoint(
        "/webhook/login",
        {
          method: "POST",
          body: webhookLoginBodySchema,
          metadata: {
            openapi: {
              description:
                "Debug-only webhook login endpoint backed by Better Auth session creation.",
            },
          },
        },
        async (ctx) => {
          const { secret, email, userId } = ctx.body;
          const jsonError = (status: number, body: Record<string, string>) =>
            new Response(JSON.stringify(body), {
              status,
              headers: {
                "content-type": "application/json",
              },
            });

          const webhookSecret = process.env.WEBHOOK_SECRET;
          if (!webhookSecret || secret !== webhookSecret) {
            logOAuthDebug("webhook-login.auth-failed", ctx.request, {
              reason: "invalid_or_missing_secret",
            });
            return jsonError(403, { error: "Forbidden" });
          }

          if (!email && !userId) {
            logOAuthDebug("webhook-login.missing-params", ctx.request, {
              reason: "neither_email_nor_userId_provided",
            });
            return jsonError(400, {
              error: "Either email or userId is required",
            });
          }

          const user = await prisma.user.findFirst({
            where: {
              OR: [
                ...(email ? [{ email }] : []),
                ...(userId
                  ? [{ id: userId }, { username: userId }, { name: userId }]
                  : []),
              ],
            },
          });

          if (!user) {
            logOAuthDebug("webhook-login.user-not-found", ctx.request, {
              hasEmail: Boolean(email),
              hasUserId: Boolean(userId),
            });
            return jsonError(404, { error: "User not found" });
          }

          const authUser = await ctx.context.internalAdapter.findUserById(
            user.id,
          );
          if (!authUser) {
            logOAuthDebug(
              "webhook-login.user-missing-in-adapter",
              ctx.request,
              {
                userId: user.id,
              },
            );
            return jsonError(404, { error: "User not found" });
          }

          const session = await ctx.context.internalAdapter.createSession(
            authUser.id,
          );
          await setSessionCookie(ctx, {
            session,
            user: authUser,
          });

          logOAuthDebug("webhook-login.success", ctx.request, {
            userId: authUser.id,
          });

          return ctx.json({
            ok: true,
            userId: authUser.id,
            email: authUser.email,
            sessionToken: session.token,
            expires: new Date(session.expiresAt).toISOString(),
          });
        },
      ),
    },
  };
}
