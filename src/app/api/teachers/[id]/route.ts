import type { NextRequest } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  jsonResponse,
  notFound,
  parseInteger,
} from "@/lib/api/helpers";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Get teacher detail by numeric ID.
 * @pathParams resourceIdPathParamsSchema
 * @response teacherDetailSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = resourceIdPathParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return invalidParamResponse("teacher ID");
    }

    const parsedId = parseInteger(parsedParams.data.id);
    if (parsedId === null) {
      return invalidParamResponse("teacher ID");
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: parsedId },
      include: {
        department: true,
        teacherTitle: true,
        sections: {
          include: {
            course: {
              include: {
                educationLevel: true,
                category: true,
                classify: true,
                classType: true,
                gradation: true,
                type: true,
              },
            },
            semester: true,
          },
          orderBy: [
            { semester: { jwId: "desc" } },
            { course: { nameCn: "asc" } },
          ],
        },
        _count: {
          select: {
            sections: true,
          },
        },
      },
    });

    if (!teacher) {
      return notFound("Teacher not found");
    }

    return jsonResponse(teacher);
  } catch (error) {
    return handleRouteError("Failed to fetch teacher", error);
  }
}
