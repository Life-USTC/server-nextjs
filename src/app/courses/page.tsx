import CoursesPage from "@/components/CoursesPage";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getCourses(searchTerm?: string) {
  try {
    const where = searchTerm
      ? {
          OR: [
            { nameCn: { contains: searchTerm, mode: "insensitive" as const } },
            { nameEn: { contains: searchTerm, mode: "insensitive" as const } },
            { code: { contains: searchTerm, mode: "insensitive" as const } },
          ],
        }
      : {};

    const courses = await db.course.findMany({
      where,
      take: 100,
      include: {
        type: true,
        educationLevel: true,
        category: true,
        classType: true,
      },
      orderBy: { code: "asc" },
    });

    return courses;
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return [];
  }
}

export default async function CoursesRoutePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchTerm = typeof params.q === "string" ? params.q : undefined;
  const courses = await getCourses(searchTerm);

  return <CoursesPage searchTerm={searchTerm} courses={courses} />;
}
