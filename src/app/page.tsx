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

export default async function Home() {
  const stats = await getStats();

  return <HomePage stats={stats} recentSemesters={[]} />;
}
