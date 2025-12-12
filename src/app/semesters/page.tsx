import SemestersPage from "@/components/SemestersPage";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getSemesters() {
  try {
    const semesters = await db.semester.findMany({
      orderBy: { startDate: "desc" },
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

export default async function SemestersRoutePage() {
  const semesters = await getSemesters();

  return <SemestersPage semesters={semesters} />;
}
