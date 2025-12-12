import { notFound } from "next/navigation";
import CourseDetailPage from "@/components/CourseDetailPage";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCourse(id: number) {
  try {
    const course = await db.course.findUnique({
      where: { id },
      include: {
        type: true,
        educationLevel: true,
        category: true,
        classType: true,
        classify: true,
        gradation: true,
        sections: {
          take: 10,
          include: {
            semester: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            id: "desc",
          },
        },
      },
    });

    return course;
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return null;
  }
}

export default async function CourseDetailRoutePage({ params }: PageProps) {
  const { id } = await params;
  const course = await getCourse(Number.parseInt(id, 10));

  if (!course) {
    notFound();
  }

  return <CourseDetailPage course={course} />;
}
