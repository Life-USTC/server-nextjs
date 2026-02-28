import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  forbidden,
  handleRouteError,
  invalidParamResponse,
  notFound,
  unauthorized,
} from "@/lib/api-helpers";
import { userCalendarPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import { createMultiSectionCalendar } from "@/lib/ical";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Generate calendar ICS for a user's selected sections.
 * @pathParams userCalendarPathParamsSchema
 * @response 200:binary
 * @response 401:openApiErrorSchema
 * @response 403:openApiErrorSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = userCalendarPathParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return invalidParamResponse("user ID");
    }

    const { userId } = parsedParams.data;
    const token = new URL(request.url).searchParams.get("token")?.trim();

    let user = null;

    if (token) {
      user = await prisma.user.findFirst({
        where: {
          id: userId,
          calendarFeedToken: token,
        },
        include: {
          subscribedSections: {
            include: {
              course: true,
              schedules: {
                include: {
                  room: {
                    include: {
                      building: {
                        include: {
                          campus: true,
                        },
                      },
                    },
                  },
                  teachers: true,
                },
              },
              exams: {
                include: {
                  examRooms: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return forbidden("Invalid or unauthorized token");
      }
    } else {
      const session = await auth();

      if (!session?.user?.id) {
        return unauthorized();
      }

      if (session.user.id !== userId) {
        return forbidden("You can only access your own calendar");
      }

      user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscribedSections: {
            include: {
              course: true,
              schedules: {
                include: {
                  room: {
                    include: {
                      building: {
                        include: {
                          campus: true,
                        },
                      },
                    },
                  },
                  teachers: true,
                },
              },
              exams: {
                include: {
                  examRooms: true,
                },
              },
            },
          },
        },
      });
    }

    if (!user || user.subscribedSections.length === 0) {
      return notFound("No selected sections found");
    }

    const calendar = await createMultiSectionCalendar(user.subscribedSections);
    const icsData = calendar.toString();

    return new NextResponse(icsData, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="life-ustc-subscriptions.ics"',
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return handleRouteError("Failed to generate user calendar", error);
  }
}
