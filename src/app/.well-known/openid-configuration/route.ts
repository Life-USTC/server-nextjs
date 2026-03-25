import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { betterAuthInstance } from "@/auth";

export const dynamic = "force-dynamic";

export const GET = oauthProviderOpenIdConfigMetadata(betterAuthInstance);
