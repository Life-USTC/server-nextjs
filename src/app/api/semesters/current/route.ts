import { handleRouteError, jsonResponse, notFound } from "@/lib/api/helpers";
import { findCurrentSemester } from "@/lib/current-semester";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Get current semester.
 * @response semesterSchema
 * @response 404:openApiErrorSchema
 */
export async function GET() {
  try {
    const now = new Date();

    const currentSemester = await findCurrentSemester(prisma.semester, now);

    if (!currentSemester) {
      return notFound("No current semester found");
    }

    return jsonResponse(currentSemester);
  } catch (error) {
    return handleRouteError("Failed to fetch current semester", error);
  }
}
