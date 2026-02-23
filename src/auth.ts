import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type OAuthProfile = {
  email?: string | null;
  image?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  name?: string | null;
};

const isDev = process.env.NODE_ENV === "development";
const DEV_DEBUG_PROVIDER_ID = "dev-debug";
const DEV_ADMIN_PROVIDER_ID = "dev-admin";
const DEV_DEBUG_USERNAME =
  process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() || "dev-user";
const DEV_DEBUG_NAME = process.env.DEV_DEBUG_NAME?.trim() || "Dev Debug User";

const DEV_ADMIN_USERNAME =
  process.env.DEV_ADMIN_USERNAME?.trim().toLowerCase() || "dev-admin";
const DEV_ADMIN_NAME = process.env.DEV_ADMIN_NAME?.trim() || "Dev Admin User";

const prismaAdapter = PrismaAdapter(
  prisma as unknown as Parameters<typeof PrismaAdapter>[0],
);

const adapter: Adapter = {
  ...prismaAdapter,
  createUser: async (adapterUser: AdapterUser) => {
    const { email, emailVerified, ...userData } = adapterUser;
    const user = await prisma.user.create({ data: userData });
    return {
      ...user,
      email: email ?? "",
      emailVerified: emailVerified ?? null,
    } as AdapterUser;
  },
  getUser: async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return { ...user, email: "", emailVerified: null } as AdapterUser;
  },
  getUserByEmail: async (_: string) => null,
  getUserByAccount: async (account) => {
    const user = await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      },
    });
    if (!user) return null;
    return { ...user, email: "", emailVerified: null } as AdapterUser;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: {
    strategy: isDev ? "jwt" : "database",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    GitHub({
      allowDangerousEmailAccountLinking: false,
    }),
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
    ...(isDev
      ? [
          Credentials({
            id: DEV_DEBUG_PROVIDER_ID,
            name: "Dev Debug",
            credentials: {},
            authorize: async () => {
              const user = await prisma.user.upsert({
                where: { username: DEV_DEBUG_USERNAME },
                update: {
                  name: DEV_DEBUG_NAME,
                },
                create: {
                  username: DEV_DEBUG_USERNAME,
                  name: DEV_DEBUG_NAME,
                  image:
                    "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev",
                },
              });

              return {
                id: user.id,
                name: user.name,
                image: user.image,
                isAdmin: user.isAdmin,
                username: user.username,
              };
            },
          }),
          Credentials({
            id: DEV_ADMIN_PROVIDER_ID,
            name: "Dev Admin",
            credentials: {},
            authorize: async () => {
              const user = await prisma.user.upsert({
                where: { username: DEV_ADMIN_USERNAME },
                update: {
                  name: DEV_ADMIN_NAME,
                  isAdmin: true,
                },
                create: {
                  username: DEV_ADMIN_USERNAME,
                  name: DEV_ADMIN_NAME,
                  isAdmin: true,
                  image:
                    "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-admin",
                },
              });

              return {
                id: user.id,
                name: user.name,
                image: user.image,
                isAdmin: true,
                username: user.username,
              };
            },
          }),
        ]
      : []),
    {
      id: "oidc",
      name: "USTC",
      type: "oidc",
      issuer: "https://sso-proxy.lug.ustc.edu.cn/auth/oauth2",
      clientId: process.env.AUTH_OIDC_CLIENT_ID,
      clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
      authorization: { params: { scope: "openid" } },
      checks: ["pkce", "state"],
      style: {
        logo: "/images/ustc_favicon.png",
        bg: "#fff",
        text: "#000",
      },
      profile(profile) {
        if (isDev) {
          console.log(
            "OIDC Profile Fetched:",
            JSON.stringify(profile, null, 2),
          );
        }

        return {
          id: profile.sub,
          name: profile.name ?? null,
          image: profile.picture ?? null,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.id) return true;
      if (
        account.provider === DEV_DEBUG_PROVIDER_ID ||
        account.provider === DEV_ADMIN_PROVIDER_ID
      ) {
        return isDev;
      }

      if (isDev) {
        console.log(
          `Profile fetched for ${account.provider}:`,
          JSON.stringify(profile, null, 2),
        );
      }

      // Check if user already exists in database
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // For new users, skip - linkAccount event will handle it
      if (!existingUser) {
        return true;
      }

      // Extract email from profile
      const email = profile?.email;

      if (email) {
        try {
          await prisma.verifiedEmail.upsert({
            where: {
              provider_email: {
                provider: account.provider,
                email: email,
              },
            },
            update: {
              userId: user.id,
            },
            create: {
              email: email,
              provider: account.provider,
              userId: user.id,
            },
          });
        } catch (error) {
          console.error("Failed to upsert VerifiedEmail:", error);
        }
      }

      // Handle profile picture and name update for existing users
      await updateUserProfileFromProvider(existingUser, profile);

      return true;
    },
    async jwt({ token, user }) {
      const nextToken = token as JWT & {
        isAdmin?: boolean;
        username?: string | null;
      };

      if (user) {
        const typedUser = user as AdapterUser & {
          isAdmin?: boolean;
          username?: string | null;
        };
        nextToken.sub = user.id;
        nextToken.isAdmin = typedUser.isAdmin ?? false;
        nextToken.username = typedUser.username ?? null;
        return nextToken;
      }

      if (
        isDev &&
        typeof nextToken.sub === "string" &&
        (nextToken.isAdmin === undefined || nextToken.username === undefined)
      ) {
        const dbUser = await prisma.user.findUnique({
          where: { id: nextToken.sub },
          select: { isAdmin: true, username: true },
        });
        nextToken.isAdmin = dbUser?.isAdmin ?? false;
        nextToken.username = dbUser?.username ?? null;
      }

      return nextToken;
    },
    session: ({ session, user, token }) => {
      const typedToken = token as
        | (JWT & { isAdmin?: boolean; username?: string | null })
        | undefined;
      const typedUser = user as
        | (AdapterUser & { isAdmin?: boolean; username?: string | null })
        | undefined;
      const resolvedId =
        typedUser?.id ??
        (typeof typedToken?.sub === "string" ? typedToken.sub : "");

      return {
        ...session,
        user: {
          ...session.user,
          id: resolvedId,
          isAdmin: typedUser?.isAdmin ?? typedToken?.isAdmin ?? false,
          username: typedUser?.username ?? typedToken?.username ?? null,
        },
      };
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      // This event fires after the account is linked and user exists in DB
      const email = profile?.email;

      if (email && user.id) {
        try {
          await prisma.verifiedEmail.upsert({
            where: {
              provider_email: {
                provider: account.provider,
                email: email,
              },
            },
            update: {
              userId: user.id,
            },
            create: {
              email: email,
              provider: account.provider,
              userId: user.id,
            },
          });
        } catch (error) {
          console.error(
            "Failed to upsert VerifiedEmail in linkAccount:",
            error,
          );
        }
      }

      // Update profile picture and name
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser) {
        await updateUserProfileFromProvider(dbUser, profile);
      }
    },
  },
  debug: isDev,
  logger: {
    error(code, ...message) {
      console.error(code, message);
    },
    warn(code, ...message) {
      console.warn(code, message);
    },
    debug(code, ...message) {
      if (isDev) {
        console.debug(code, message);
      }
    },
  },
});

/**
 * Helper function to update user profile from OAuth provider data
 */
async function updateUserProfileFromProvider(
  dbUser: {
    id: string;
    name: string | null;
    image: string | null;
    profilePictures: string[];
  },
  profile: OAuthProfile | null | undefined,
) {
  try {
    const image = profile?.image || profile?.picture || profile?.avatar_url;
    const name = profile?.name;

    const updates: Prisma.UserUpdateInput = {};
    let shouldUpdate = false;

    if (image) {
      const currentPics = dbUser.profilePictures || [];
      if (!currentPics.includes(image)) {
        updates.profilePictures = { push: image };
        shouldUpdate = true;
        if (!dbUser.image) {
          updates.image = image;
        }
      }
    }

    if (!dbUser.name && name) {
      updates.name = name;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: updates,
      });
    }
  } catch (error) {
    console.error("Failed to update user profile info:", error);
  }
}
