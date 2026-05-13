/**
 * Register the first-party iOS OAuth2 client (Life@USTC).
 *
 * Usage:
 *   bun run tools/production/util/register-ios-client.ts
 *
 * This is idempotent — it upserts by clientId so it's safe to re-run.
 */
import type { Prisma } from "@/generated/prisma/client";
import { createToolPrisma } from "../../shared/tool-prisma";

const prisma = createToolPrisma();

const IOS_CLIENT = {
  clientId: "life-ustc-ios",
  name: "Life@USTC iOS",
  redirectUris: ["dev.tiankaima.life-ustc://auth/callback"],
  scopes: ["openid", "profile", "email", "offline_access"],
  grantTypes: ["authorization_code", "refresh_token"],
  responseTypes: ["code"],
  tokenEndpointAuthMethod: "none",
  public: true,
  requirePKCE: true,
  disabled: false,
  clientSecret: null,
  metadata: {
    source: "first-party",
    platform: "ios",
  } satisfies Prisma.InputJsonObject,
} as const;

async function main() {
  const existing = await prisma.oAuthClient.findUnique({
    where: { clientId: IOS_CLIENT.clientId },
    select: { id: true, clientId: true },
  });

  if (existing) {
    await prisma.oAuthClient.update({
      where: { clientId: IOS_CLIENT.clientId },
      data: {
        name: IOS_CLIENT.name,
        redirectUris: [...IOS_CLIENT.redirectUris],
        scopes: [...IOS_CLIENT.scopes],
        grantTypes: [...IOS_CLIENT.grantTypes],
        responseTypes: [...IOS_CLIENT.responseTypes],
        tokenEndpointAuthMethod: IOS_CLIENT.tokenEndpointAuthMethod,
        public: IOS_CLIENT.public,
        requirePKCE: IOS_CLIENT.requirePKCE,
        disabled: IOS_CLIENT.disabled,
        metadata: IOS_CLIENT.metadata,
      },
    });
    console.log(
      `✅ Updated existing iOS client (clientId: ${IOS_CLIENT.clientId})`,
    );
  } else {
    await prisma.oAuthClient.create({
      data: {
        clientId: IOS_CLIENT.clientId,
        name: IOS_CLIENT.name,
        redirectUris: [...IOS_CLIENT.redirectUris],
        scopes: [...IOS_CLIENT.scopes],
        grantTypes: [...IOS_CLIENT.grantTypes],
        responseTypes: [...IOS_CLIENT.responseTypes],
        tokenEndpointAuthMethod: IOS_CLIENT.tokenEndpointAuthMethod,
        public: IOS_CLIENT.public,
        requirePKCE: IOS_CLIENT.requirePKCE,
        disabled: IOS_CLIENT.disabled,
        clientSecret: null,
        metadata: IOS_CLIENT.metadata,
      },
    });
    console.log(`✅ Created iOS client (clientId: ${IOS_CLIENT.clientId})`);
  }

  console.log(`   redirect_uri: ${IOS_CLIENT.redirectUris[0]}`);
  console.log(`   public: true, PKCE required`);
  console.log(`   scopes: ${IOS_CLIENT.scopes.join(" ")}`);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
