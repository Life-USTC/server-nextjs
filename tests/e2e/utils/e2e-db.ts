import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export const PLAYWRIGHT_BASE_URL = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

const BUN_DB_SCRIPT_MAX_ATTEMPTS = 3;

function isTransientBunEvalCrash(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    signal?: string | null;
    stderr?: string | Buffer;
    message?: string;
  };

  if (candidate.signal === "SIGSEGV") return true;

  const stderr =
    typeof candidate.stderr === "string"
      ? candidate.stderr
      : candidate.stderr instanceof Buffer
        ? candidate.stderr.toString("utf8")
        : "";
  const text = `${candidate.message ?? ""}\n${stderr}`;
  return (
    text.includes("Segmentation fault") ||
    text.includes("panic(main thread)") ||
    text.includes("Bun has crashed")
  );
}

function runDbScript<T>(source: string): T {
  let lastError: unknown;

  for (let attempt = 1; attempt <= BUN_DB_SCRIPT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const output = execFileSync("bun", ["--eval", source], {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
      });
      return JSON.parse(output) as T;
    } catch (error) {
      if (
        attempt < BUN_DB_SCRIPT_MAX_ATTEMPTS &&
        isTransientBunEvalCrash(error)
      ) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

function generateToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export async function getCurrentSessionUser(page: Page) {
  const response = await page.request.get("/api/auth/get-session");
  expect(response.status()).toBe(200);
  const session = (await response.json()) as {
    user?: {
      id?: string;
      username?: string | null;
      isAdmin?: boolean;
    };
  };
  expect(typeof session.user?.id).toBe("string");
  return session.user as {
    id: string;
    username?: string | null;
    isAdmin?: boolean;
  };
}

export function getUserProfileById(userId: string) {
  return runDbScript<{
    name: string | null;
    username: string | null;
    image: string | null;
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ${JSON.stringify(userId)} },
      select: { name: true, username: true, image: true },
    });

    console.log(JSON.stringify(user));
    await prisma.$disconnect();
  `);
}

export function ensureUserCalendarFeedFixture(userId: string) {
  return runDbScript<{
    userId: string;
    token: string;
    path: string;
  }>(`
    import { buildUserCalendarFeedPath, ensureUserCalendarFeedToken } from "./src/lib/calendar-feed-token";

    const userId = ${JSON.stringify(userId)};
    const token = await ensureUserCalendarFeedToken(userId);

    console.log(JSON.stringify({
      userId,
      token,
      path: buildUserCalendarFeedPath(userId, token),
    }));
  `);
}

export function updateUserProfileById(
  userId: string,
  data: {
    name?: string | null;
    username?: string | null;
    image?: string | null;
  },
) {
  const normalizedData = {
    ...data,
    ...(data.name === null ? { name: "" } : {}),
  };

  runDbScript<{ ok: true }>(`
    import { prisma } from "./src/lib/db/prisma";

    await prisma.user.update({
      where: { id: ${JSON.stringify(userId)} },
      data: ${JSON.stringify(normalizedData)},
    });

    console.log(JSON.stringify({ ok: true }));
    await prisma.$disconnect();
  `);
}

export function getUserSubscribedSectionIds(userId: string) {
  return runDbScript<number[]>(`
    import { prisma } from "./src/lib/db/prisma";

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ${JSON.stringify(userId)} },
      select: {
        subscribedSections: {
          select: { id: true },
          orderBy: { id: "asc" },
        },
      },
    });

    console.log(JSON.stringify(user.subscribedSections.map((section) => section.id)));
    await prisma.$disconnect();
  `);
}

export function replaceUserSubscribedSectionIds(
  userId: string,
  sectionIds: number[],
) {
  runDbScript<{ ok: true }>(`
    import { prisma } from "./src/lib/db/prisma";

    await prisma.user.update({
      where: { id: ${JSON.stringify(userId)} },
      data: {
        subscribedSections: {
          set: ${JSON.stringify(sectionIds)}.map((id) => ({ id })),
        },
      },
    });

    console.log(JSON.stringify({ ok: true }));
    await prisma.$disconnect();
  `);
}

export async function createOAuthClientFixture(
  options: {
    name?: string;
    redirectUris?: string[];
    scopes?: string[];
    grantTypes?: string[];
    clientId?: string;
    clientSecret?: string;
    tokenEndpointAuthMethod?:
      | "client_secret_basic"
      | "client_secret_post"
      | "none";
  } = {},
) {
  const clientId = options.clientId ?? generateToken(16);
  const tokenEndpointAuthMethod =
    options.tokenEndpointAuthMethod ?? "client_secret_basic";
  const clientSecret =
    tokenEndpointAuthMethod === "none"
      ? null
      : (options.clientSecret ?? generateToken(24));
  const publicClientStoredSecret = generateToken(24);
  const redirectUris = options.redirectUris ?? [
    `${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`,
  ];
  const grantTypes =
    options.grantTypes ??
    (tokenEndpointAuthMethod === "none"
      ? ["authorization_code"]
      : ["authorization_code", "refresh_token"]);
  const scopes = options.scopes ?? ["openid", "profile"];
  const name = options.name ?? `e2e-oauth-${Date.now()}`;

  const client = runDbScript<{
    id: string;
    clientId: string;
    name: string;
    tokenEndpointAuthMethod: string;
    redirectUris: string[];
    scopes: string[];
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    const client = await prisma.oAuthClient.create({
      data: {
        name: ${JSON.stringify(name)},
        clientId: ${JSON.stringify(clientId)},
        clientSecret: ${JSON.stringify(
          tokenEndpointAuthMethod === "none"
            ? publicClientStoredSecret
            : clientSecret,
        )},
        redirectUris: ${JSON.stringify(redirectUris)},
        type: ${JSON.stringify(
          tokenEndpointAuthMethod === "none" ? "public" : "web",
        )},
        tokenEndpointAuthMethod: ${JSON.stringify(tokenEndpointAuthMethod)},
        disabled: false,
        scopes: ${JSON.stringify(scopes)},
        grantTypes: ${JSON.stringify(grantTypes)},
        responseTypes: ["code"],
        requirePKCE: true,
        metadata: ${JSON.stringify({ source: "e2e_fixture" })},
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        tokenEndpointAuthMethod: true,
        redirectUris: true,
        scopes: true,
      },
    });

    const normalized = {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      tokenEndpointAuthMethod: client.tokenEndpointAuthMethod ?? "client_secret_basic",
      redirectUris: client.redirectUris,
      scopes: client.scopes,
    };

    console.log(JSON.stringify(normalized));
    await prisma.$disconnect();
  `);

  return {
    ...client,
    clientSecret,
  };
}

export function deleteOAuthClientsByName(name: string) {
  runDbScript<{ ok: true }>(`
    import { prisma } from "./src/lib/db/prisma";

    await prisma.oAuthClient.deleteMany({
      where: { name: ${JSON.stringify(name)} },
    });

    console.log(JSON.stringify({ ok: true }));
    await prisma.$disconnect();
  `);
}

export function ensureLinkedAccountFixture(options: {
  userId: string;
  provider: "github" | "google" | "oidc";
  providerAccountId?: string;
  email?: string;
}) {
  const providerAccountId =
    options.providerAccountId ??
    `${options.provider}-e2e-${Date.now()}-${generateToken(6)}`;
  const email =
    options.email ??
    `${options.provider}-${Date.now()}-${generateToken(6)}@example.test`;

  return runDbScript<{
    provider: string;
    providerAccountId: string;
    email: string;
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    await prisma.account.create({
      data: {
        userId: ${JSON.stringify(options.userId)},
        type: "oauth",
        provider: ${JSON.stringify(options.provider)},
        providerAccountId: ${JSON.stringify(providerAccountId)},
      },
    });

    await prisma.verifiedEmail.create({
      data: {
        userId: ${JSON.stringify(options.userId)},
        provider: ${JSON.stringify(options.provider)},
        email: ${JSON.stringify(email)},
      },
    });

    console.log(JSON.stringify({
      provider: ${JSON.stringify(options.provider)},
      providerAccountId: ${JSON.stringify(providerAccountId)},
      email: ${JSON.stringify(email)},
    }));
    await prisma.$disconnect();
  `);
}

export function deleteLinkedAccountFixture(options: {
  userId: string;
  provider: string;
}) {
  runDbScript<{ ok: true }>(`
    import { prisma } from "./src/lib/db/prisma";

    await prisma.account.deleteMany({
      where: {
        userId: ${JSON.stringify(options.userId)},
        provider: ${JSON.stringify(options.provider)},
      },
    });

    await prisma.verifiedEmail.deleteMany({
      where: {
        userId: ${JSON.stringify(options.userId)},
        provider: ${JSON.stringify(options.provider)},
      },
    });

    console.log(JSON.stringify({ ok: true }));
    await prisma.$disconnect();
  `);
}

export function createTempUsersFixture(options: {
  prefix: string;
  count: number;
}) {
  return runDbScript<{
    usernames: string[];
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    const prefix = ${JSON.stringify(options.prefix)};
    const count = ${JSON.stringify(options.count)};
    const usernames = [];

    for (let index = 0; index < count; index += 1) {
      const username = \`\${prefix}-\${String(index).padStart(2, "0")}\`;
      usernames.push(username);
      const user = await prisma.user.create({
        data: {
          username,
          email: \`\${username}@users.local\`,
          emailVerified: true,
          name: \`E2E \${username}\`,
        },
      });
      await prisma.verifiedEmail.create({
        data: {
          userId: user.id,
          provider: "oidc",
          email: \`\${username}@example.test\`,
        },
      });
    }

    console.log(JSON.stringify({ usernames }));
    await prisma.$disconnect();
  `);
}

export function deleteUsersByPrefix(prefix: string) {
  runDbScript<{ ok: true }>(`
    import { prisma } from "./src/lib/db/prisma";

    await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: ${JSON.stringify(prefix)},
        },
      },
    });

    console.log(JSON.stringify({ ok: true }));
    await prisma.$disconnect();
  `);
}

export function getSeedCourseFilterFixture(jwId: number) {
  return runDbScript<{
    educationLevelId: number | null;
    educationLevelName: string | null;
    categoryId: number | null;
    categoryName: string | null;
    classTypeId: number | null;
    classTypeName: string | null;
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    const course = await prisma.course.findUniqueOrThrow({
      where: { jwId: ${JSON.stringify(jwId)} },
      select: {
        educationLevelId: true,
        categoryId: true,
        classTypeId: true,
        educationLevel: { select: { nameCn: true } },
        category: { select: { nameCn: true } },
        classType: { select: { nameCn: true } },
      },
    });

    console.log(JSON.stringify({
      educationLevelId: course.educationLevelId,
      educationLevelName: course.educationLevel?.nameCn ?? null,
      categoryId: course.categoryId,
      categoryName: course.category?.nameCn ?? null,
      classTypeId: course.classTypeId,
      classTypeName: course.classType?.nameCn ?? null,
    }));
    await prisma.$disconnect();
  `);
}

export function getSeedTeacherDepartmentFixture(code: string) {
  return runDbScript<{
    departmentId: number | null;
    departmentName: string | null;
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    const teacher = await prisma.teacher.findUniqueOrThrow({
      where: { code: ${JSON.stringify(code)} },
      select: {
        departmentId: true,
        department: { select: { nameCn: true } },
      },
    });

    console.log(JSON.stringify({
      departmentId: teacher.departmentId,
      departmentName: teacher.department?.nameCn ?? null,
    }));
    await prisma.$disconnect();
  `);
}

export function getSeedSectionSemesterFixture(jwId: number) {
  return runDbScript<{
    semesterId: number | null;
    semesterName: string | null;
  }>(`
    import { prisma } from "./src/lib/db/prisma";

    const section = await prisma.section.findUniqueOrThrow({
      where: { jwId: ${JSON.stringify(jwId)} },
      select: {
        semesterId: true,
        semester: { select: { nameCn: true } },
      },
    });

    console.log(JSON.stringify({
      semesterId: section.semesterId,
      semesterName: section.semester?.nameCn ?? null,
    }));
    await prisma.$disconnect();
  `);
}
