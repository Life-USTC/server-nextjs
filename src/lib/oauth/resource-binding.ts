import { prisma } from "@/lib/db/prisma";
import {
  normalizeResourceIndicator,
  resourceIndicatorsMatch,
} from "@/lib/oauth/utils";

const OAUTH_RESOURCE_CODE_PREFIX = "oauth-resource:code:";
const OAUTH_RESOURCE_ACCESS_PREFIX = "oauth-resource:access:";
const OAUTH_RESOURCE_REFRESH_PREFIX = "oauth-resource:refresh:";

export function getCodeResourceBindingIdentifier(code: string) {
  return `${OAUTH_RESOURCE_CODE_PREFIX}${code}`;
}

export function getAccessTokenResourceBindingIdentifier(accessToken: string) {
  return `${OAUTH_RESOURCE_ACCESS_PREFIX}${accessToken}`;
}

export function getRefreshTokenResourceBindingIdentifier(refreshToken: string) {
  return `${OAUTH_RESOURCE_REFRESH_PREFIX}${refreshToken}`;
}

export function parseAndNormalizeResource(
  value: string | undefined | null,
): string | null {
  if (!value) {
    return null;
  }
  return normalizeResourceIndicator(value);
}

export function resourcesEqual(
  left: string | undefined | null,
  right: string | undefined | null,
) {
  if (!left || !right) {
    return false;
  }
  return resourceIndicatorsMatch(left, right);
}

export async function setResourceBinding({
  identifier,
  resource,
  expiresAt,
}: {
  identifier: string;
  resource: string;
  expiresAt: Date;
}) {
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: resource,
      expires: expiresAt,
    },
  });
}

export async function deleteResourceBinding(identifier: string) {
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });
}

export async function getResourceBinding(identifier: string) {
  const binding = await prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
    select: {
      identifier: true,
      token: true,
      expires: true,
    },
  });

  if (!binding) {
    return null;
  }

  if (binding.expires < new Date()) {
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
    return null;
  }

  return {
    identifier: binding.identifier,
    resource: binding.token,
    expiresAt: binding.expires,
  };
}
