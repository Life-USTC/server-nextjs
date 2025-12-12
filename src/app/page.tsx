import HomePage from "@/components/HomePage";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [coursesCount, semestersCount] = await Promise.all([
      db.course.count(),
      db.semester.count(),
    ]);

    return {
      courses: coursesCount,
      semesters: semestersCount,
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return {
      courses: 0,
      semesters: 0,
    };
  }
}

async function getRecentSemesters() {
  try {
    const semesters = await db.semester.findMany({
      orderBy: { startDate: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        startDate: true,
        endDate: true,
      },
    });
    return semesters;
  } catch (error) {
    console.error("Failed to fetch semesters:", error);
    return [];
  }
}

export default async function Home() {
  const stats = await getStats();
  const recentSemesters = await getRecentSemesters();

  return <HomePage stats={stats} recentSemesters={recentSemesters} />;
}
