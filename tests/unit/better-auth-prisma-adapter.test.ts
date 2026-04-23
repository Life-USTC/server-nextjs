import { describe, expect, it, vi } from "vitest";

const prismaAdapterMock = vi.hoisted(() => vi.fn(() => "adapter-result"));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: prismaAdapterMock,
}));

describe("createBetterAuthPrismaAdapter", () => {
  it("centralizes Better Auth Prisma adapter configuration", async () => {
    const { createBetterAuthPrismaAdapter } = await import(
      "@/lib/auth/better-auth-prisma-adapter"
    );
    const prisma = {};

    expect(createBetterAuthPrismaAdapter(prisma as never)).toBe(
      "adapter-result",
    );
    expect(prismaAdapterMock).toHaveBeenCalledWith(prisma, {
      provider: "postgresql",
    });
  });
});
