import { readFile, writeFile } from "node:fs/promises";

type OpenApiDocument = {
  openapi?: string;
  info?: unknown;
  servers?: unknown;
  paths?: Record<string, Record<string, Record<string, unknown>>>;
  components?: unknown;
  tags?: Array<{ name: string; description?: string }>;
};

function tagForPath(path: string): { name: string; description: string } {
  const table: Array<{
    match: (p: string) => boolean;
    name: string;
    description: string;
  }> = [
    {
      match: (p) => p.startsWith("/api/admin/"),
      name: "Admin",
      description: "Admin and moderation endpoints",
    },
    {
      match: (p) => p.startsWith("/api/comments"),
      name: "Comments",
      description: "Comment threads, reactions, and moderation",
    },
    {
      match: (p) => p.startsWith("/api/homeworks"),
      name: "Homeworks",
      description: "Homework management and completion status",
    },
    {
      match: (p) => p.startsWith("/api/uploads"),
      name: "Uploads",
      description: "Upload presign, finalize, and file management",
    },
    {
      match: (p) => p.startsWith("/api/descriptions"),
      name: "Descriptions",
      description: "User-generated description content and history",
    },
    {
      match: (p) => p.startsWith("/api/sections"),
      name: "Sections",
      description: "Course sections, calendars, and schedules",
    },
    {
      match: (p) => p.startsWith("/api/courses"),
      name: "Courses",
      description: "Course catalog and search",
    },
    {
      match: (p) => p.startsWith("/api/teachers"),
      name: "Teachers",
      description: "Teacher directory and search",
    },
    {
      match: (p) => p.startsWith("/api/schedules"),
      name: "Schedules",
      description: "Schedules search and filtering",
    },
    {
      match: (p) => p.startsWith("/api/semesters"),
      name: "Semesters",
      description: "Semester listing and current semester",
    },
    {
      match: (p) => p.startsWith("/api/calendar-subscriptions"),
      name: "Calendar",
      description: "Calendar subscriptions and tokens",
    },
    {
      match: (p) => p.startsWith("/api/locale"),
      name: "Locale",
      description: "Locale switching and locale cookies",
    },
    {
      match: (p) => p.startsWith("/api/metadata"),
      name: "Metadata",
      description: "Metadata dictionaries for filters",
    },
    {
      match: (p) => p.startsWith("/api/openapi"),
      name: "OpenAPI",
      description: "OpenAPI document endpoint",
    },
  ];

  const found = table.find((entry) => entry.match(path));
  return (
    found ?? {
      name: "Api",
      description: "General API endpoints",
    }
  );
}

function isOperationKey(key: string) {
  return [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace",
  ].includes(key);
}

function sortPathItemKeys(pathItem: Record<string, unknown>) {
  const operationOrder = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace",
  ];

  const keys = Object.keys(pathItem);
  keys.sort((a, b) => {
    const ai = operationOrder.indexOf(a);
    const bi = operationOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      return (
        (ai === -1 ? Number.POSITIVE_INFINITY : ai) -
        (bi === -1 ? Number.POSITIVE_INFINITY : bi)
      );
    }
    return a.localeCompare(b);
  });

  const next: Record<string, unknown> = {};
  for (const key of keys) {
    next[key] = pathItem[key];
  }
  return next;
}

function buildTopLevelTags(paths: NonNullable<OpenApiDocument["paths"]>) {
  const byName = new Map<string, { name: string; description: string }>();
  for (const path of Object.keys(paths)) {
    const tag = tagForPath(path);
    byName.set(tag.name, tag);
  }

  const preferredOrder = [
    "Admin",
    "Comments",
    "Homeworks",
    "Uploads",
    "Descriptions",
    "Sections",
    "Courses",
    "Teachers",
    "Schedules",
    "Semesters",
    "Calendar",
    "Locale",
    "Metadata",
    "OpenAPI",
    "Api",
  ];

  const tags = Array.from(byName.values());
  tags.sort((a, b) => {
    const ai = preferredOrder.indexOf(a.name);
    const bi = preferredOrder.indexOf(b.name);
    if (ai !== -1 || bi !== -1) {
      return (
        (ai === -1 ? Number.POSITIVE_INFINITY : ai) -
        (bi === -1 ? Number.POSITIVE_INFINITY : bi)
      );
    }
    return a.name.localeCompare(b.name);
  });

  return tags.map((t) => ({ name: t.name, description: t.description }));
}

async function main() {
  const filePath = new URL("../public/openapi.generated.json", import.meta.url);
  const raw = await readFile(filePath, "utf8");
  const doc = JSON.parse(raw) as OpenApiDocument;

  if (!doc.paths || typeof doc.paths !== "object") {
    throw new Error("Invalid OpenAPI document: missing paths");
  }

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    const tag = tagForPath(path);
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isOperationKey(method)) {
        continue;
      }
      if (!operation || typeof operation !== "object") {
        continue;
      }
      (operation as { tags?: unknown }).tags = [tag.name];
    }
  }

  const sortedPaths = Object.fromEntries(
    Object.entries(doc.paths)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== "object") {
          return [path, pathItem];
        }
        return [path, sortPathItemKeys(pathItem)];
      }),
  ) as OpenApiDocument["paths"];

  doc.paths = sortedPaths;

  doc.tags = buildTopLevelTags(doc.paths);
  await writeFile(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

await main();
