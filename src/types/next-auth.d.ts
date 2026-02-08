import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      username?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
    username?: string | null;
  }
}
