import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { homeworkCompletionRequestSchema } from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid completion payload", error, 400);
  }

  const parsedBody = homeworkCompletionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid completion payload",
      parsedBody.error,
      400,
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const homework = await prisma.homework.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!homework || homework.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (parsedBody.data.completed) {
      const completion = await prisma.homeworkCompletion.upsert({
        where: { userId_homeworkId: { userId, homeworkId: id } },
        update: { completedAt: new Date() },
        create: { userId, homeworkId: id },
      });

      return NextResponse.json({
        completed: true,
        completedAt: completion.completedAt,
      });
    }

    await prisma.homeworkCompletion.deleteMany({
      where: { userId, homeworkId: id },
    });

    return NextResponse.json({ completed: false, completedAt: null });
  } catch (error) {
    return handleRouteError("Failed to update completion", error);
  }
}
