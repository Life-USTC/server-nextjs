import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const skip = (page - 1) * limit;

    const sectionId = searchParams.get("sectionId");
    const teacherId = searchParams.get("teacherId");
    const roomId = searchParams.get("roomId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const weekday = searchParams.get("weekday");

    const whereClause: any = {};
    if (sectionId) whereClause.sectionId = parseInt(sectionId, 10);
    if (teacherId) whereClause.teacherId = parseInt(teacherId, 10);
    if (roomId) whereClause.roomId = parseInt(roomId, 10);
    if (dateFrom)
      whereClause.date = { ...whereClause.date, gte: new Date(dateFrom) };
    if (dateTo)
      whereClause.date = { ...whereClause.date, lte: new Date(dateTo) };
    if (weekday !== null && weekday !== undefined)
      whereClause.weekday = parseInt(weekday, 10);

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          room: {
            include: {
              building: {
                include: {
                  campus: true,
                },
              },
              roomType: true,
            },
          },
          teacher: {
            include: {
              department: true,
            },
          },
          section: {
            include: {
              course: true,
            },
          },
          scheduleGroup: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.schedule.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: schedules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}
