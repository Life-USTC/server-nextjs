import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb";
import { prisma } from "@/lib/prisma";

async function getCourseData(courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      educationLevel: true,
      category: true,
      classType: true,
    },
  });

  if (!course) {
    return null;
  }

  const sections = await prisma.section.findMany({
    where: { courseId },
    include: {
      semester: true,
      campus: true,
      teachers: {
        include: {
          department: true,
        },
      },
    },
  });

  const sortedSections = sections.sort((a, b) => {
    const semesterA = a.semester?.name || "";
    const semesterB = b.semester?.name || "";
    if (semesterA !== semesterB) {
      return semesterB.localeCompare(semesterA);
    }
    return a.code.localeCompare(b.code);
  });

  return {
    course,
    sections: sortedSections,
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCourseData(Number(id));

  if (!data) {
    notFound();
  }

  const { course, sections } = data;

  // Group sections by semester
  const semesterMap = new Map<string, typeof sections>();
  sections.forEach((section) => {
    const semesterName = section.semester?.name || "Unknown";
    if (!semesterMap.has(semesterName)) {
      semesterMap.set(semesterName, []);
    }
    semesterMap.get(semesterName)?.push(section);
  });

  const sortedSemesters = Array.from(semesterMap.entries()).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
    { label: course.code },
  ];

  return (
    <main className="page-main">
      <Breadcrumb items={breadcrumbItems} />

      <h1 className="text-display mb-4">{course.nameCn}</h1>
      {course.nameEn && <p className="text-subtitle mb-4">{course.nameEn}</p>}

      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-tag tag-base tag-section-code">
          {course.code}
        </span>
        {course.educationLevel && (
          <span className="text-tag tag-base tag-education-level">
            {course.educationLevel.nameCn}
          </span>
        )}
        {course.category && (
          <span className="text-tag tag-base tag-category">
            {course.category.nameCn}
          </span>
        )}
        {course.classType && (
          <span className="text-tag tag-base tag-class-type">
            {course.classType.nameCn}
          </span>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-title-2 mb-4">
          Available Sections ({sections.length})
        </h2>
        {sortedSemesters.map(([semesterName, semesterSections]) => (
          <div key={semesterName} className="mb-6">
            <h3 className="text-subtitle mb-3">
              {semesterName} ({semesterSections.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {semesterSections.map((section) => (
                <Link
                  key={section.id}
                  href={`/sections/${section.id}`}
                  className="block p-4 bg-surface rounded-lg border border-base hover:border-interactive-hover transition-colors no-underline"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <span className="text-tag tag-base tag-section-code">
                        {section.code}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-body text-muted-strong">
                    {section.teachers && section.teachers.length > 0 && (
                      <p>
                        <strong>Teachers:</strong>{" "}
                        {section.teachers.map((t) => t.nameCn).join(", ")}
                      </p>
                    )}
                    {section.campus && (
                      <p>
                        <strong>Campus:</strong> {section.campus.nameCn}
                      </p>
                    )}
                    <p>
                      <strong>Capacity:</strong> {section.stdCount ?? 0} /{" "}
                      {section.limitCount ?? "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-muted">No sections available for this course</p>
        )}
      </div>
    </main>
  );
}
