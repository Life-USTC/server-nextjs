import { hashPassword } from "better-auth/crypto";
import { getOptionalLowercaseEnv, getOptionalTrimmedEnv } from "@/env";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { allowDebugAuth, isDevelopment } from "./auth-config";
import {
  DEV_DEBUG_PROVIDER_ID,
  type DebugProviderId,
  isDebugProviderId,
} from "./provider-ids";

type DebugProviderConfig = {
  username: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  image: string;
};

const DEV_DEBUG_USERNAME =
  getOptionalLowercaseEnv("DEV_DEBUG_USERNAME") ?? "dev-user";
const DEV_DEBUG_NAME =
  getOptionalTrimmedEnv("DEV_DEBUG_NAME") ?? "Dev Debug User";
const DEV_ADMIN_USERNAME =
  getOptionalLowercaseEnv("DEV_ADMIN_USERNAME") ?? "dev-admin";
const DEV_ADMIN_NAME =
  getOptionalTrimmedEnv("DEV_ADMIN_NAME") ?? "Dev Admin User";
const DEV_DEBUG_EMAIL =
  getOptionalLowercaseEnv("DEV_DEBUG_EMAIL") ??
  `${DEV_DEBUG_USERNAME}@debug.local`;
const DEV_ADMIN_EMAIL =
  getOptionalLowercaseEnv("DEV_ADMIN_EMAIL") ??
  `${DEV_ADMIN_USERNAME}@debug.local`;

const DEV_DEBUG_PASSWORD = (() => {
  const value = getOptionalTrimmedEnv("DEV_DEBUG_PASSWORD");
  if (allowDebugAuth && !isDevelopment) {
    if (!value) {
      throw new Error(
        "DEV_DEBUG_PASSWORD is required when E2E_DEBUG_AUTH=1 (non-development NODE_ENV)",
      );
    }
    return value;
  }
  return value || "dev-debug-password";
})();

const DEV_ADMIN_PASSWORD = (() => {
  const value = getOptionalTrimmedEnv("DEV_ADMIN_PASSWORD");
  if (allowDebugAuth && !isDevelopment) {
    if (!value) {
      throw new Error(
        "DEV_ADMIN_PASSWORD is required when E2E_DEBUG_AUTH=1 (non-development NODE_ENV)",
      );
    }
    return value;
  }
  return value || "dev-admin-password";
})();

export function getDebugProviderConfig(
  providerId: DebugProviderId,
): DebugProviderConfig {
  if (providerId === DEV_DEBUG_PROVIDER_ID) {
    return {
      username: DEV_DEBUG_USERNAME,
      name: DEV_DEBUG_NAME,
      email: DEV_DEBUG_EMAIL,
      password: DEV_DEBUG_PASSWORD,
      isAdmin: false,
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev",
    };
  }

  return {
    username: DEV_ADMIN_USERNAME,
    name: DEV_ADMIN_NAME,
    email: DEV_ADMIN_EMAIL,
    password: DEV_ADMIN_PASSWORD,
    isAdmin: true,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-admin",
  };
}

export async function ensureDebugCredentialUser(providerId: DebugProviderId) {
  const config = getDebugProviderConfig(providerId);
  const hashedPassword = await hashPassword(config.password);
  const userData = {
    username: config.username,
    email: config.email,
    emailVerified: true,
    name: config.name,
    image: config.image,
    isAdmin: config.isAdmin,
    profilePictures: [config.image],
  };

  const upsertDebugUserByIdentity = async () => {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: config.username }, { email: config.email }],
      },
      select: { id: true },
    });

    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          ...userData,
          profilePictures: { set: userData.profilePictures },
        },
        select: { id: true },
      });
    }

    return prisma.user.create({
      data: userData,
      select: { id: true },
    });
  };

  let user: { id: string };
  try {
    user = await upsertDebugUserByIdentity();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      user = await upsertDebugUserByIdentity();
    } else {
      throw error;
    }
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "credential",
        providerAccountId: user.id,
      },
    },
    update: {
      userId: user.id,
      type: "credential",
      provider: "credential",
      password: hashedPassword,
    },
    create: {
      userId: user.id,
      type: "credential",
      provider: "credential",
      providerAccountId: user.id,
      password: hashedPassword,
    },
  });
}

export { isDebugProviderId };
