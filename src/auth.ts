import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const adapter: Adapter = {
  ...PrismaAdapter(prisma),
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
        console.log("OIDC Profile Fetched:", JSON.stringify(profile, null, 2));

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

      console.log(
        `Profile fetched for ${account.provider}:`,
        JSON.stringify(profile, null, 2),
      );

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
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
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
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, ...message) {
      console.error(code, message);
    },
    warn(code, ...message) {
      console.warn(code, message);
    },
    debug(code, ...message) {
      console.debug(code, message);
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
  profile: any,
) {
  try {
    const picture = profile?.picture || profile?.avatar_url;
    const name = profile?.name;

    const updates: any = {};
    let shouldUpdate = false;

    if (picture) {
      const currentPics = dbUser.profilePictures || [];
      if (!currentPics.includes(picture)) {
        updates.profilePictures = { push: picture };
        shouldUpdate = true;
        if (!dbUser.image) {
          updates.image = picture;
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
