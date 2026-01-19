import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      allowDangerousEmailAccountLinking: false,
    }),
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
    {
      id: "oidc",
      name: "OIDC",
      type: "oidc",
      issuer: "https://sso-proxy.lug.ustc.edu.cn/auth/oauth2",
      clientId: process.env.AUTH_OIDC_CLIENT_ID,
      clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
      authorization: { params: { scope: "openid" } },
      checks: ["pkce", "state"],
      profile(profile) {
        // Log the full profile for debugging
        console.log("OIDC Profile Fetched:", JSON.stringify(profile, null, 2));

        return {
          id: profile.sub,
          name: profile.name ?? null,
          image: profile.picture ?? null,
          // We don't map email here anymore as it's not on the User model
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.id) return true;

      // Log profile for all providers
      console.log(
        `Profile fetched for ${account.provider}:`,
        JSON.stringify(profile, null, 2),
      );

      // Extract email from profile
      let email: string | undefined | null;
      if (account.provider === "oidc") {
        email = (profile as any).email;
      } else {
        email = profile?.email;
      }

      if (email) {
        try {
          // Upsert VerifiedEmail
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
          // Don't block sign in, but log the error
        }
      }

      // Handle profile picture and name update
      try {
        const picture =
          (profile as any).picture || (profile as any).avatar_url || user.image;
        const name = (profile as any).name;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (dbUser) {
          const updates: any = {};
          let shouldUpdate = false;

          // Update profile pictures
          if (picture) {
            const currentPics = dbUser.profilePictures || [];
            if (!currentPics.includes(picture)) {
              updates.profilePictures = { push: picture };
              shouldUpdate = true;
              // Set as main image if none exists
              if (!dbUser.image) {
                updates.image = picture;
              }
            }
          }

          // Update name if missing
          if (!dbUser.name && name) {
            updates.name = name;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            await prisma.user.update({
              where: { id: user.id },
              data: updates,
            });
          }
        }
      } catch (error) {
        console.error("Failed to update user profile info:", error);
      }

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
