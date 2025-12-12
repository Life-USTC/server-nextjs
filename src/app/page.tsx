export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Life USTC Server API</h1>

        <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">
          Modern course and schedule management API for USTC built with Next.js,
          Prisma, and Supabase.
        </p>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Complete RESTful API for course management</li>
            <li>Advanced filtering and pagination</li>
            <li>Type-safe with TypeScript and Prisma</li>
            <li>Fast runtime with Bun</li>
            <li>Modern Next.js App Router architecture</li>
          </ul>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-2">Campuses</h3>
              <ul className="space-y-1 font-mono text-sm">
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/campuses
                </li>
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/campuses/[id]
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Semesters</h3>
              <ul className="space-y-1 font-mono text-sm">
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/semesters
                </li>
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/semesters/current
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Courses</h3>
              <ul className="space-y-1 font-mono text-sm">
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/courses?search=query
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Sections</h3>
              <ul className="space-y-1 font-mono text-sm">
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/sections?courseId=1&semesterId=1
                </li>
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/sections/[id]
                </li>
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/sections/[id]/schedules
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Schedules</h3>
              <ul className="space-y-1 font-mono text-sm">
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/schedules?dateFrom=2024-01-01
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Metadata</h3>
              <ul className="space-y-1 font-mono text-sm">
                <li className="text-blue-600 dark:text-blue-400">
                  GET /api/metadata
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Next.js",
              "Prisma",
              "Supabase",
              "PostgreSQL",
              "TypeScript",
              "Bun",
              "Zod",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-full text-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Check out the README.md for setup instructions and documentation.
          </p>
          <code className="block bg-gray-900 text-green-400 p-4 rounded">
            bun install && bun run prisma:generate && bun dev
          </code>
        </div>
      </main>
    </div>
  );
}
