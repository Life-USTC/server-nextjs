import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.scss";

export const dynamic = 'force-dynamic'

// Data configurations
const FEATURES = [
  "Complete RESTful API for course management",
  "Advanced filtering and pagination",
  "Type-safe with TypeScript and Prisma",
  "Server-side rendering with Next.js App Router",
  "Responsive design for all devices",
] as const;

const TECH_STACK = [
  "Next.js",
  "Prisma",
  "PostgreSQL",
  "TypeScript",
  "Zod",
  "Ant Design",
  "Tailwind CSS",
] as const;

const API_ENDPOINTS = [
  {
    title: "Courses",
    endpoints: [
      {
        label: "GET /api/courses?page=1&limit=10",
        href: "/api/courses?page=1&limit=10",
      },
    ],
  },
  {
    title: "Sections",
    endpoints: [
      {
        label: "GET /api/sections?page=1&limit=10",
        href: "/api/sections?page=1&limit=10",
      },
      { label: "GET /api/sections/[id]" },
      { label: "GET /api/sections/[id]/schedules" },
    ],
  },
  {
    title: "Schedules",
    endpoints: [
      {
        label: "GET /api/schedules?page=1&limit=10",
        href: "/api/schedules?page=1&limit=10",
      },
    ],
  },
  {
    title: "Semesters",
    endpoints: [
      {
        label: "GET /api/semesters?page=1&limit=10",
        href: "/api/semesters?page=1&limit=10",
      },
      {
        label: "GET /api/semesters/current",
        href: "/api/semesters/current",
      },
    ],
  },
  {
    title: "Metadata",
    endpoints: [
      {
        label: "GET /api/metadata",
        href: "/api/metadata",
      },
    ],
  },
] as const;

// Component definitions
function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  const content = (
    <>
      <div className="text-title text-primary">{formattedValue}</div>
      <div className="text-small text-muted">{label}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="stat-card stat-card-interactive">
        {content}
      </Link>
    );
  }

  return <div className="stat-card">{content}</div>;
}

function TechBadge({ children }: { children: string }) {
  return <span className="tech-badge">{children}</span>;
}

function ApiEndpointSection({
  title,
  endpoints,
}: {
  title: string;
  endpoints: ReadonlyArray<{ label: string; href?: string }>;
}) {
  return (
    <div>
      <h3 className="text-subtitle font-semibold mb-2">{title}</h3>
      <ul className="space-y-1 font-mono text-sm">
        {endpoints.map((endpoint) => (
          <li key={endpoint.label}>
            {endpoint.href ? (
              <Link
                href={endpoint.href}
                className="text-primary hover:underline"
              >
                {endpoint.label}
              </Link>
            ) : (
              <span className="text-primary">{endpoint.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Homepage() {
  const [courses, sections, schedules, semesters] = await Promise.all([
    prisma.course.count(),
    prisma.section.count(),
    prisma.schedule.count(),
    prisma.semester.count(),
  ]);

  const stats = [
    { label: "Courses", value: courses, href: "/courses" },
    { label: "Sections", value: sections, href: "/sections" },
    { label: "Schedules", value: schedules },
    { label: "Semesters", value: semesters },
  ];

  return (
    <main className="page-main">
      <Breadcrumb items={[{ label: "Home" }]} />

      <h1 className="text-display">Life@USTC Server API</h1>
      <p className="text-subtitle">
        Modern course and schedule management API for USTC built with Next.js,
        Prisma, and PostgreSQL.
      </p>

      <div className={styles.section}>
        <h2 className="text-title mb-3">Statistics</h2>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className="text-title mb-3">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-body">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h2 className="text-title mb-4">API Endpoints</h2>
        <div className={styles.apiList}>
          {API_ENDPOINTS.map((section) => (
            <ApiEndpointSection key={section.title} {...section} />
          ))}
        </div>
      </div>

      <div className={styles.techStackSection}>
        <h2 className={styles.techStackHeading}>Tech Stack</h2>
        <div className={styles.techStackGrid}>
          {TECH_STACK.map((tech) => (
            <TechBadge key={tech}>{tech}</TechBadge>
          ))}
        </div>
      </div>

      <div className={styles.gettingStarted}>
        <h2 className={styles.gettingStartedHeading}>Getting Started</h2>
        <p className="text-muted-strong mb-4">
          Check out the README.md for setup instructions and documentation.
        </p>
        <code className={styles.codeBlock}>
          bun install && bun run prisma:generate && bun run dev
        </code>
      </div>
    </main>
  );
}
