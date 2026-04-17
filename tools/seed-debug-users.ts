/**
 * Seed debug users for E2E / iOS integration testing.
 *
 * Usage:
 *   bun run tools/seed-debug-users.ts
 *
 * Creates or updates the dev-user and dev-admin accounts with credential
 * (email+password) authentication, matching what the signIn() server action
 * does when you click "Debug User" or "Admin User" on the sign-in page.
 *
 * Idempotent — safe to re-run.
 */
import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaAdapter } from "../src/lib/db/prisma-adapter";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

const USERS = [
  {
    username: "dev-user",
    name: "Dev Debug User",
    email: "dev-user@debug.local",
    password: process.env.DEV_DEBUG_PASSWORD?.trim() || "dev-debug-password",
    isAdmin: false,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev",
  },
  {
    username: "dev-admin",
    name: "Dev Admin User",
    email: "dev-admin@debug.local",
    password: process.env.DEV_ADMIN_PASSWORD?.trim() || "dev-admin-password",
    isAdmin: true,
    image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-admin",
  },
];

async function main() {
  for (const cfg of USERS) {
    const hashedPassword = await hashPassword(cfg.password);
    const userData = {
      username: cfg.username,
      email: cfg.email,
      emailVerified: true,
      name: cfg.name,
      image: cfg.image,
      isAdmin: cfg.isAdmin,
      profilePictures: [cfg.image],
    };

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: cfg.username }, { email: cfg.email }] },
      select: { id: true },
    });

    let userId: string;

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...userData,
          profilePictures: { set: userData.profilePictures },
        },
      });
      userId = existing.id;
      console.log(`✅ Updated user: ${cfg.username} (${userId})`);
    } else {
      const created = await prisma.user.create({
        data: userData,
        select: { id: true },
      });
      userId = created.id;
      console.log(`✅ Created user: ${cfg.username} (${userId})`);
    }

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "credential",
          providerAccountId: userId,
        },
      },
      update: {
        userId,
        type: "credential",
        provider: "credential",
        password: hashedPassword,
      },
      create: {
        userId,
        type: "credential",
        provider: "credential",
        providerAccountId: userId,
        password: hashedPassword,
      },
    });

    console.log(`   email: ${cfg.email}`);
    console.log(`   isAdmin: ${cfg.isAdmin}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
