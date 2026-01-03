import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

export interface AuthUser {
  id: number;
  studentId: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
}

interface JWTPayload {
  sub: string; // user.id
  studentId: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  iat: number;
  exp: number;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify<JWTPayload>(sessionToken, secret);

    return {
      id: Number(payload.sub),
      studentId: payload.studentId,
      name: payload.name,
      email: payload.email,
      avatar: payload.avatar,
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export async function setSession(user: AuthUser): Promise<void> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({
    sub: user.id.toString(),
    studentId: user.studentId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);

  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete("session");
}

export async function requireAuth(
  _request: NextRequest,
  response?: NextResponse,
): Promise<AuthUser> {
  const user = await getSession();

  if (!user) {
    if (response) {
      // For server components, just throw an error and let the component handle redirect
      throw new AuthError("Authentication required");
    } else {
      // Return error response
      throw new AuthError("Authentication required");
    }
  }

  return user;
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  const secret = new TextEncoder().encode(jwtSecret);
  return await new SignJWT({
    sub: user.id.toString(),
    studentId: user.studentId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

// Simple CAS callback handler - upserts user and returns session info
export async function handleCASCallback(casUser: {
  studentId: string;
  gid?: string;
  name?: string;
  email?: string;
  avatar?: string;
}) {
  // Upsert user based on studentId
  const user = await prisma.user.upsert({
    where: { studentId: casUser.studentId },
    update: {
      gid: casUser.gid,
      name: casUser.name,
      email: casUser.email,
      avatar: casUser.avatar,
    },
    create: {
      studentId: casUser.studentId,
      gid: casUser.gid,
      name: casUser.name,
      email: casUser.email,
      avatar: casUser.avatar,
    },
  });

  // Create session
  const sessionToken = await createSessionToken({
    id: user.id,
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  });
  return { user, sessionToken };
}
