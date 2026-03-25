import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const OIDC_CLIENT_SECRET_ENCRYPTION_PREFIX = "encv1:";

function getOidcClientSecretEncryptionKey() {
  const source =
    process.env.OIDC_CLIENT_SECRET_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET;
  const normalized = source?.trim();
  if (!normalized) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing OIDC client secret encryption key (set OIDC_CLIENT_SECRET_ENCRYPTION_KEY or AUTH_SECRET)",
      );
    }
    return null;
  }

  return createHash("sha256")
    .update(`life-ustc:oidc-client-secret:${normalized}`)
    .digest();
}

const oidcClientSecretEncryptionKey = getOidcClientSecretEncryptionKey();

function encryptOidcClientSecret(value: string) {
  if (!oidcClientSecretEncryptionKey) {
    return value;
  }
  if (value.startsWith(OIDC_CLIENT_SECRET_ENCRYPTION_PREFIX)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    oidcClientSecretEncryptionKey,
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${OIDC_CLIENT_SECRET_ENCRYPTION_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptOidcClientSecret(value: string) {
  if (
    !oidcClientSecretEncryptionKey ||
    !value.startsWith(OIDC_CLIENT_SECRET_ENCRYPTION_PREFIX)
  ) {
    return value;
  }

  const encoded = value.slice(OIDC_CLIENT_SECRET_ENCRYPTION_PREFIX.length);
  const [ivEncoded, authTagEncoded, payloadEncoded] = encoded.split(".");
  if (!ivEncoded || !authTagEncoded || !payloadEncoded) {
    throw new Error("Malformed encrypted OIDC client secret");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    oidcClientSecretEncryptionKey,
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadEncoded, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function protectOidcClientSecretField(value: unknown): unknown {
  if (typeof value === "string") {
    return encryptOidcClientSecret(value);
  }
  if (
    value &&
    typeof value === "object" &&
    "set" in value &&
    typeof (value as { set?: unknown }).set === "string"
  ) {
    const raw = value as { set: string } & Record<string, unknown>;
    return {
      ...raw,
      set: encryptOidcClientSecret(raw.set),
    };
  }
  return value;
}

function protectOidcClientSecretInData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => protectOidcClientSecretInData(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const data = value as Record<string, unknown>;
  if (!("clientSecret" in data)) {
    return data;
  }

  return {
    ...data,
    clientSecret: protectOidcClientSecretField(data.clientSecret),
  };
}

function protectOidcClientSecretInArgs(
  operation: string,
  args: unknown,
): unknown {
  if (!args || typeof args !== "object") {
    return args;
  }

  const record = args as Record<string, unknown>;

  if (operation === "create" || operation === "update") {
    return {
      ...record,
      data: protectOidcClientSecretInData(record.data),
    };
  }

  if (operation === "createMany" || operation === "updateMany") {
    return {
      ...record,
      data: protectOidcClientSecretInData(record.data),
    };
  }

  if (operation === "upsert") {
    return {
      ...record,
      create: protectOidcClientSecretInData(record.create),
      update: protectOidcClientSecretInData(record.update),
    };
  }

  return args;
}

function decryptOidcClientSecretInValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => decryptOidcClientSecretInValue(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, current] of Object.entries(record)) {
    if (key === "clientSecret" && typeof current === "string") {
      next[key] = decryptOidcClientSecret(current);
      continue;
    }

    next[key] = decryptOidcClientSecretInValue(current);
  }

  return next;
}

const oidcClientSecretProtectionExtension = Prisma.defineExtension({
  name: "oidcClientSecretProtection",
  query: {
    oidcApplication: {
      async $allOperations({ operation, args, query }) {
        const nextArgs = protectOidcClientSecretInArgs(operation, args);
        const execute = query as (next: unknown) => Promise<unknown>;
        const result = await execute(nextArgs);
        return decryptOidcClientSecretInValue(result);
      },
    },
  },
});

/**
 * Better Auth OIDC may call `create` on each authorization; we store at most one
 * consent row per (clientId, userId). Delegate create → upsert on the compound key.
 */
function oidcConsentCreateAsUpsertExtension(rawClient: PrismaClient) {
  return Prisma.defineExtension({
    name: "oidcConsentCreateAsUpsert",
    query: {
      oidcConsent: {
        async create({ args }) {
          const data = args.data;
          if (
            typeof data.clientId === "string" &&
            typeof data.userId === "string"
          ) {
            return rawClient.oidcConsent.upsert({
              where: {
                clientId_userId: {
                  clientId: data.clientId,
                  userId: data.userId,
                },
              },
              create: data,
              update: {
                scopes: data.scopes,
                consentGiven: data.consentGiven,
              },
            });
          }
          return rawClient.oidcConsent.create(args);
        },
      },
    },
  });
}

const normalizeName = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const getNamePrimary = (
  locale: string,
  nameCn: string,
  nameEn?: string | null,
) => {
  const english = normalizeName(nameEn);
  if (locale === "en-us" && english) {
    return english;
  }
  return nameCn;
};

const getNameSecondary = (
  locale: string,
  nameCn: string,
  nameEn?: string | null,
) => {
  const english = normalizeName(nameEn);
  if (locale === "en-us") {
    return english ? nameCn : null;
  }
  return english;
};

const localizedNameResult = (locale: string) => ({
  namePrimary: {
    needs: { nameCn: true, nameEn: true },
    compute: ({ nameCn, nameEn }: { nameCn: string; nameEn?: string | null }) =>
      getNamePrimary(locale, nameCn, nameEn),
  },
  nameSecondary: {
    needs: { nameCn: true, nameEn: true },
    compute: ({ nameCn, nameEn }: { nameCn: string; nameEn?: string | null }) =>
      getNameSecondary(locale, nameCn, nameEn),
  },
});

const localizedNamesExtension = (locale: string) =>
  Prisma.defineExtension({
    name: "localizedNames",
    result: {
      adminClass: localizedNameResult(locale),
      building: localizedNameResult(locale),
      campus: localizedNameResult(locale),
      classType: localizedNameResult(locale),
      course: localizedNameResult(locale),
      courseCategory: localizedNameResult(locale),
      courseClassify: localizedNameResult(locale),
      courseGradation: localizedNameResult(locale),
      courseType: localizedNameResult(locale),
      department: localizedNameResult(locale),
      educationLevel: localizedNameResult(locale),
      examBatch: localizedNameResult(locale),
      examMode: localizedNameResult(locale),
      room: localizedNameResult(locale),
      roomType: localizedNameResult(locale),
      teacher: localizedNameResult(locale),
      teacherLessonType: localizedNameResult(locale),
      teacherTitle: localizedNameResult(locale),
      teachLanguage: localizedNameResult(locale),
    },
  });

export const adapter = new PrismaPg({ connectionString });
const basePrisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });
export const prisma = basePrisma
  .$extends(oidcConsentCreateAsUpsertExtension(basePrisma))
  .$extends(oidcClientSecretProtectionExtension) as unknown as PrismaClient;

const _makeExtendedClient = (locale: string) =>
  prisma.$extends(localizedNamesExtension(locale));

type ExtendedPrismaClient = ReturnType<typeof _makeExtendedClient>;

const extendedClientCache = new Map<string, ExtendedPrismaClient>();

export const getPrisma = (locale: string): ExtendedPrismaClient => {
  const cached = extendedClientCache.get(locale);
  if (cached) return cached;
  const extended = _makeExtendedClient(locale);
  extendedClientCache.set(locale, extended);
  return extended;
};

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
