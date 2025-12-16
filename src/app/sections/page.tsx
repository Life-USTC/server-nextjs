import type { Prisma, Semester } from "@prisma/client";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb";
import Pagination from "@/components/pagination";
import { prisma } from "@/lib/prisma";
import { paginatedSectionQuery } from "@/lib/query-helpers";

async function fetchSections(
  page: number,
  semesterId?: string,
  search?: string,
) {
  const where: Prisma.SectionWhereInput = {};
  if (semesterId) {
    const parsedSemesterId = parseInt(semesterId, 10);
    if (!Number.isNaN(parsedSemesterId)) {
      where.semesterId = parsedSemesterId;
    }
  }
  if (search) {
    where.OR = [
      {
        course: { nameCn: { contains: search, mode: "insensitive" as const } },
      },
      {
        course: { nameEn: { contains: search, mode: "insensitive" as const } },
      },
      { course: { code: { contains: search, mode: "insensitive" as const } } },
      { code: { contains: search, mode: "insensitive" as const } },
    ];
  }

  return paginatedSectionQuery(page, where);
}

async function fetchSemesters(): Promise<Semester[]> {
  const semesters = await prisma.semester.findMany({
    take: 100,
    orderBy: { name: "desc" },
  });

  return semesters;
}

export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    semesterId?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const semesterId = params.semesterId;
  const search = params.search;

  const [data, semesters] = await Promise.all([
    fetchSections(page, semesterId, search),
    fetchSemesters(),
  ]);

  const { data: sections, pagination } = data;
  const { page: currentPage, total, totalPages } = pagination;
  const selectedSemester = semesters.find(
    (s) => s.id.toString() === semesterId,
  );

  const breadcrumbItems = [{ label: "Home", href: "/" }, { label: "Sections" }];

  return (
    <main className="page-main">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-8">
        <h1 className="text-display mb-2">All Sections</h1>
        <p className="text-subtitle">
          Browse and filter through all available course sections
        </p>
      </div>

      <form method="get" action="/sections" className="mb-8">
        <div className="flex flex-wrap gap-2">
          <select
            name="semesterId"
            defaultValue={semesterId || ""}
            className="px-4 py-2 bg-surface-elevated border border-base rounded-lg hover:bg-surface transition-colors font-medium cursor-pointer"
          >
            <option value="">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by course name, code, or section code..."
            className="flex-1 min-w-[300px] px-4 py-2 bg-surface-elevated border border-base rounded-lg focus:outline-none focus:ring-2 ring-primary"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg transition-colors"
          >
            Search
          </button>
          {(search || semesterId) && (
            <Link
              href="/sections"
              className="px-4 py-2 bg-interactive hover:bg-interactive-hover text-muted-strong rounded-lg transition-colors no-underline flex items-center"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted">
          Showing {sections.length} of {total} sections
          {search && (
            <span className="ml-2">
              for &quot;<strong>{search}</strong>&quot;
            </span>
          )}
          {selectedSemester && (
            <span className="ml-2">
              in <strong>{selectedSemester.name}</strong>
            </span>
          )}
        </p>
      </div>

      {sections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/sections/${section.id}`}
              className="block p-6 bg-surface-elevated rounded-lg border border-base hover:border-interactive-hover transition-colors no-underline hover:no-underline focus-visible:no-underline"
            >
              <div className="mb-3">
                <h3 className="text-subtitle text-emphasis mb-2">
                  {section.course.nameCn}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {section.semester && (
                    <span className="text-tag tag-base tag-semester">
                      {section.semester.name}
                    </span>
                  )}
                  <span className="text-tag tag-base tag-section-code">
                    {section.code}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-body text-muted-strong mb-3">
                {section.teachers && section.teachers.length > 0 && (
                  <p>
                    <strong className="text-emphasis">Teachers:</strong>{" "}
                    {section.teachers.map((t) => t.nameCn).join(", ")}
                  </p>
                )}
                {section.campus && (
                  <p>
                    <strong className="text-emphasis">Campus:</strong>{" "}
                    {section.campus.nameCn}
                  </p>
                )}
                {section.openDepartment && (
                  <p>
                    <strong className="text-emphasis">Department:</strong>{" "}
                    {section.openDepartment.nameCn}
                  </p>
                )}
                {section.credits !== null && (
                  <p>
                    <strong className="text-emphasis">Credits:</strong>{" "}
                    {section.credits}
                  </p>
                )}
                <p>
                  <strong className="text-emphasis">Capacity:</strong>{" "}
                  <span className="text-tag tag-base tag-capacity">
                    {section.stdCount ?? 0} / {section.limitCount ?? "—"}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted">
            No sections found
            {search && (
              <span>
                {" "}
                for &quot;<strong>{search}</strong>&quot;
              </span>
            )}
            {selectedSemester && (
              <span>
                {" "}
                in <strong>{selectedSemester.name}</strong>
              </span>
            )}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/sections"
          searchParams={{
            ...(semesterId && { semesterId }),
            ...(search && { search }),
          }}
        />
      )}
    </main>
  );
}
