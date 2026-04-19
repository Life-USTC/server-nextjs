import { readFile, writeFile } from "node:fs/promises";

type OpenApiDocument = {
  openapi?: string;
  info?: unknown;
  servers?: unknown;
  paths?: Record<string, Record<string, Record<string, unknown>>>;
  components?: unknown;
  tags?: Array<{ name: string; description?: string }>;
};

type OpenApiOperation = Record<string, unknown>;

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
      description: "Calendar selections",
    },
    {
      match: (p) => p.startsWith("/api/users/") && p.endsWith("/calendar.ics"),
      name: "Calendar",
      description: "User calendar export",
    },
    {
      match: (p) => p.startsWith("/api/bus"),
      name: "Bus",
      description: "Shuttle bus schedules and preferences",
    },
    {
      match: (p) => p.startsWith("/api/todos"),
      name: "Todos",
      description: "Personal todo management",
    },
    {
      match: (p) => p.startsWith("/api/metadata"),
      name: "Metadata",
      description: "Metadata dictionaries for filters",
    },
    {
      match: (p) => p.startsWith("/api/me"),
      name: "Me",
      description: "Current user profile, subscriptions, and personal data",
    },
    {
      match: (p) => p.startsWith("/api/dashboard-links"),
      name: "DashboardLinks",
      description: "Dashboard link pinning and click tracking",
    },
    {
      match: (p) => p.startsWith("/api/locale"),
      name: "Locale",
      description: "Locale switching and locale cookies",
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

// ── OperationId rewriting ──────────────────────────────────────────────────────

type OperationIdRule = {
  match: (method: string, path: string) => boolean;
  operationId: string;
};

const operationIdRules: OperationIdRule[] = [
  // Admin
  {
    match: (m, p) => m === "get" && p === "/api/admin/users",
    operationId: "listAdminUsers",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/admin/users/{id}",
    operationId: "updateAdminUser",
  },
  {
    match: (m, p) => m === "get" && p === "/api/admin/comments",
    operationId: "listAdminComments",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/admin/comments/{id}",
    operationId: "moderateAdminComment",
  },
  {
    match: (m, p) => m === "get" && p === "/api/admin/descriptions",
    operationId: "listAdminDescriptions",
  },
  {
    match: (m, p) => m === "get" && p === "/api/admin/homeworks",
    operationId: "listAdminHomeworks",
  },
  {
    match: (m, p) => m === "delete" && p === "/api/admin/homeworks/{id}",
    operationId: "deleteAdminHomework",
  },
  {
    match: (m, p) => m === "get" && p === "/api/admin/suspensions",
    operationId: "listAdminSuspensions",
  },
  {
    match: (m, p) => m === "post" && p === "/api/admin/suspensions",
    operationId: "createAdminSuspension",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/admin/suspensions/{id}",
    operationId: "updateAdminSuspension",
  },
  // Comments
  {
    match: (m, p) => m === "get" && p === "/api/comments",
    operationId: "listComments",
  },
  {
    match: (m, p) => m === "post" && p === "/api/comments",
    operationId: "createComment",
  },
  {
    match: (m, p) => m === "get" && p === "/api/comments/{id}",
    operationId: "getComment",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/comments/{id}",
    operationId: "updateComment",
  },
  {
    match: (m, p) => m === "delete" && p === "/api/comments/{id}",
    operationId: "deleteComment",
  },
  {
    match: (m, p) => m === "post" && p === "/api/comments/{id}/reactions",
    operationId: "addCommentReaction",
  },
  {
    match: (m, p) => m === "delete" && p === "/api/comments/{id}/reactions",
    operationId: "removeCommentReaction",
  },
  // Homeworks
  {
    match: (m, p) => m === "get" && p === "/api/homeworks",
    operationId: "listHomeworks",
  },
  {
    match: (m, p) => m === "post" && p === "/api/homeworks",
    operationId: "createHomework",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/homeworks/{id}",
    operationId: "updateHomework",
  },
  {
    match: (m, p) => m === "delete" && p === "/api/homeworks/{id}",
    operationId: "deleteHomework",
  },
  {
    match: (m, p) => m === "put" && p === "/api/homeworks/{id}/completion",
    operationId: "setHomeworkCompletion",
  },
  // Uploads
  {
    match: (m, p) => m === "get" && p === "/api/uploads",
    operationId: "listUploads",
  },
  {
    match: (m, p) => m === "post" && p === "/api/uploads",
    operationId: "createUpload",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/uploads/{id}",
    operationId: "renameUpload",
  },
  {
    match: (m, p) => m === "delete" && p === "/api/uploads/{id}",
    operationId: "deleteUpload",
  },
  {
    match: (m, p) => m === "get" && p === "/api/uploads/{id}/download",
    operationId: "downloadUpload",
  },
  {
    match: (m, p) => m === "post" && p === "/api/uploads/complete",
    operationId: "completeUpload",
  },
  // Descriptions
  {
    match: (m, p) => m === "get" && p === "/api/descriptions",
    operationId: "getDescription",
  },
  {
    match: (m, p) => m === "post" && p === "/api/descriptions",
    operationId: "upsertDescription",
  },
  // Sections
  {
    match: (m, p) => m === "get" && p === "/api/sections",
    operationId: "listSections",
  },
  {
    match: (m, p) => m === "get" && p === "/api/sections/{jwId}",
    operationId: "getSection",
  },
  {
    match: (m, p) => m === "post" && p === "/api/sections/match-codes",
    operationId: "matchSectionCodes",
  },
  {
    match: (m, p) => m === "get" && p === "/api/sections/{jwId}/schedules",
    operationId: "getSectionSchedules",
  },
  {
    match: (m, p) =>
      m === "get" && p === "/api/sections/{jwId}/schedule-groups",
    operationId: "getSectionScheduleGroups",
  },
  {
    match: (m, p) => m === "get" && p === "/api/sections/{jwId}/calendar.ics",
    operationId: "getSectionCalendar",
  },
  {
    match: (m, p) => m === "get" && p === "/api/sections/calendar.ics",
    operationId: "getSectionsCalendar",
  },
  // Courses
  {
    match: (m, p) => m === "get" && p === "/api/courses",
    operationId: "listCourses",
  },
  {
    match: (m, p) => m === "get" && p === "/api/courses/{jwId}",
    operationId: "getCourse",
  },
  // Teachers
  {
    match: (m, p) => m === "get" && p === "/api/teachers",
    operationId: "listTeachers",
  },
  {
    match: (m, p) => m === "get" && p === "/api/teachers/{id}",
    operationId: "getTeacher",
  },
  // Schedules
  {
    match: (m, p) => m === "get" && p === "/api/schedules",
    operationId: "listSchedules",
  },
  // Semesters
  {
    match: (m, p) => m === "get" && p === "/api/semesters",
    operationId: "listSemesters",
  },
  {
    match: (m, p) => m === "get" && p === "/api/semesters/current",
    operationId: "getCurrentSemester",
  },
  // Calendar
  {
    match: (m, p) => m === "post" && p === "/api/calendar-subscriptions",
    operationId: "setCalendarSubscription",
  },
  {
    match: (m, p) => m === "get" && p === "/api/calendar-subscriptions/current",
    operationId: "getCurrentCalendarSubscription",
  },
  {
    match: (m, p) => m === "get" && p === "/api/users/{userId}/calendar.ics",
    operationId: "getUserCalendar",
  },
  // Bus
  { match: (m, p) => m === "get" && p === "/api/bus", operationId: "queryBus" },
  {
    match: (m, p) => m === "get" && p === "/api/bus/preferences",
    operationId: "getBusPreferences",
  },
  {
    match: (m, p) => m === "post" && p === "/api/bus/preferences",
    operationId: "setBusPreferences",
  },
  // Todos
  {
    match: (m, p) => m === "get" && p === "/api/todos",
    operationId: "listTodos",
  },
  {
    match: (m, p) => m === "post" && p === "/api/todos",
    operationId: "createTodo",
  },
  {
    match: (m, p) => m === "patch" && p === "/api/todos/{id}",
    operationId: "updateTodo",
  },
  {
    match: (m, p) => m === "delete" && p === "/api/todos/{id}",
    operationId: "deleteTodo",
  },
  // Me
  { match: (m, p) => m === "get" && p === "/api/me", operationId: "getMe" },
  {
    match: (m, p) => m === "get" && p === "/api/me/subscriptions/homeworks",
    operationId: "getSubscribedHomeworks",
  },
  // Dashboard Links
  {
    match: (m, p) => m === "get" && p === "/api/dashboard-links/visit",
    operationId: "visitDashboardLink",
  },
  {
    match: (m, p) => m === "post" && p === "/api/dashboard-links/visit",
    operationId: "recordDashboardLinkVisit",
  },
  {
    match: (m, p) => m === "post" && p === "/api/dashboard-links/pin",
    operationId: "pinDashboardLink",
  },
  // Metadata
  {
    match: (m, p) => m === "get" && p === "/api/metadata",
    operationId: "getMetadata",
  },
  // Locale
  {
    match: (m, p) => m === "post" && p === "/api/locale",
    operationId: "setLocale",
  },
  // OpenAPI
  {
    match: (m, p) => m === "get" && p === "/api/openapi",
    operationId: "getOpenApiSpec",
  },
];

function rewriteOperationId(
  method: string,
  path: string,
  currentId: string,
): string {
  for (const rule of operationIdRules) {
    if (rule.match(method, path)) {
      return rule.operationId;
    }
  }
  return currentId;
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
    "Bus",
    "Todos",
    "Me",
    "DashboardLinks",
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

function setRedirectResponse(
  operation: OpenApiOperation,
  statusCode: number,
  description: string,
) {
  operation.responses = {
    [String(statusCode)]: {
      description,
      headers: {
        Location: {
          description: "Redirect target URL",
          schema: { type: "string" },
        },
      },
    },
  };
}

function setFormRequestBody(operation: OpenApiOperation, schemaRef: string) {
  operation.requestBody = {
    required: true,
    content: {
      "application/x-www-form-urlencoded": {
        schema: {
          $ref: schemaRef,
        },
      },
    },
  };
}

function patchRedirectOperations(paths: NonNullable<OpenApiDocument["paths"]>) {
  const pinPost = paths["/api/dashboard-links/pin"]?.post as
    | OpenApiOperation
    | undefined;
  if (pinPost) {
    setFormRequestBody(
      pinPost,
      "#/components/schemas/dashboardLinkPinRequestSchema",
    );
    setRedirectResponse(pinPost, 303, "Redirect after pin/unpin");
  }

  const visitGet = paths["/api/dashboard-links/visit"]?.get as
    | OpenApiOperation
    | undefined;
  if (visitGet) {
    setRedirectResponse(visitGet, 307, "Temporary redirect to target link");
  }

  const visitPost = paths["/api/dashboard-links/visit"]?.post as
    | OpenApiOperation
    | undefined;
  if (visitPost) {
    setFormRequestBody(
      visitPost,
      "#/components/schemas/dashboardLinkVisitRequestSchema",
    );
    setRedirectResponse(visitPost, 303, "Redirect after recording link click");
  }
}

// ── Fix OpenAPI 3.1 → 3.0 exclusive min/max ─────────────────────────────────

/**
 * In OpenAPI 3.1 / JSON Schema 2020-12, exclusiveMinimum and exclusiveMaximum
 * are numbers. In 3.0 they are booleans and the threshold is set via
 * minimum / maximum. Zod's toJSONSchema emits the 3.1 form but we declare
 * 3.0, so we patch here.
 */
function fixExclusiveMinMax(obj: unknown): void {
  if (obj === null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) fixExclusiveMinMax(item);
    return;
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.exclusiveMinimum === "number") {
    record.minimum = record.exclusiveMinimum;
    record.exclusiveMinimum = true;
  }
  if (typeof record.exclusiveMaximum === "number") {
    record.maximum = record.exclusiveMaximum;
    record.exclusiveMaximum = true;
  }
  for (const value of Object.values(record)) {
    fixExclusiveMinMax(value);
  }
}

/**
 * Zod's toJSONSchema may emit `$defs` with `$ref: "#/$defs/..."` inside
 * component schemas. OpenAPI 3.0 doesn't support `$defs`, so we inline
 * every `$ref` that points at a `$defs` entry and then remove the key.
 *
 * For recursive schemas (e.g. comment replies referencing the comment schema),
 * we replace self-references with an empty object to break the cycle.
 */
function inlineDefs(obj: unknown): void {
  if (obj === null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) inlineDefs(item);
    return;
  }
  const record = obj as Record<string, unknown>;
  const defs = record.$defs as Record<string, unknown> | undefined;
  if (defs && typeof defs === "object") {
    // Recursively resolve $ref: "#/$defs/..." inside this schema
    resolveLocalRefs(record, defs, 0);
    delete record.$defs;
  }
  for (const value of Object.values(record)) {
    inlineDefs(value);
  }
}

const MAX_INLINE_DEPTH = 3;

function resolveLocalRefs(
  obj: unknown,
  defs: Record<string, unknown>,
  depth: number,
): void {
  if (obj === null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i] as Record<string, unknown>;
      if (
        item &&
        typeof item.$ref === "string" &&
        item.$ref.startsWith("#/$defs/")
      ) {
        const defName = item.$ref.slice("#/$defs/".length);
        if (defs[defName] && depth < MAX_INLINE_DEPTH) {
          const inlined = JSON.parse(JSON.stringify(defs[defName]));
          resolveLocalRefs(inlined, defs, depth + 1);
          obj[i] = inlined;
        } else {
          // Recursive or too deep — replace with empty schema
          obj[i] = { type: "object", description: "(recursive)" };
        }
      } else {
        resolveLocalRefs(item, defs, depth);
      }
    }
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as Record<string, unknown>).$ref === "string"
    ) {
      const ref = (value as Record<string, unknown>).$ref as string;
      if (ref.startsWith("#/$defs/")) {
        const defName = ref.slice("#/$defs/".length);
        if (defs[defName] && depth < MAX_INLINE_DEPTH) {
          const inlined = JSON.parse(JSON.stringify(defs[defName]));
          resolveLocalRefs(inlined, defs, depth + 1);
          record[key] = inlined;
        } else {
          record[key] = { type: "object", description: "(recursive)" };
        }
      }
    }
    resolveLocalRefs(value, defs, depth);
  }
}

/**
 * Convert OpenAPI 3.1 nullable patterns to 3.0 style.
 * 3.1: `anyOf: [{type: "string"}, {type: "null"}]`
 * 3.0: `{type: "string", nullable: true}`
 */
function fixAnyOfNullable(obj: unknown): void {
  if (obj === null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) fixAnyOfNullable(item);
    return;
  }
  const record = obj as Record<string, unknown>;

  if (Array.isArray(record.anyOf) && record.anyOf.length === 2) {
    const variants = record.anyOf as Array<Record<string, unknown>>;
    const nullIdx = variants.findIndex(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        (v as Record<string, unknown>).type === "null",
    );
    if (nullIdx !== -1) {
      const other = variants[1 - nullIdx];
      if (other && typeof other === "object") {
        // Replace this schema node in-place with the non-null variant + nullable: true
        delete record.anyOf;
        for (const [k, v] of Object.entries(other)) {
          record[k] = v;
        }
        record.nullable = true;
      }
    }
  }

  for (const value of Object.values(record)) {
    fixAnyOfNullable(value);
  }
}

/**
 * Simplify remaining anyOf unions that oapi-codegen can't handle.
 * - `anyOf: [{type: "string"}, {type: "number"}]` → `{type: "string"}`
 *   (Zod coerce patterns — server accepts both, string is most permissive)
 * - `anyOf: [{type: "integer"}, {type: "string"}, {type: "null"}]` → `{type: "string", nullable: true}`
 * - `anyOf: [{obj: prop: null}, {obj: prop: {...}}]` → `{obj: prop: {... nullable: true}}`
 */
function simplifyAnyOfUnions(obj: unknown): void {
  if (obj === null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) simplifyAnyOfUnions(item);
    return;
  }
  const record = obj as Record<string, unknown>;

  if (Array.isArray(record.anyOf)) {
    const variants = record.anyOf as Array<Record<string, unknown>>;
    const types = variants
      .filter((v) => typeof v === "object" && v !== null && "type" in v)
      .map((v) => v.type as string);

    // Only simplify if all variants are simple type objects (no $ref, no complex schemas)
    const allSimple = variants.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        "type" in v &&
        typeof v.type === "string",
    );

    if (allSimple && types.length >= 2) {
      const hasNull = types.includes("null");
      const nonNull = types.filter((t) => t !== "null");

      // Only simplify scalar type unions (string, number, integer, boolean)
      // Don't simplify object unions — they're genuine discriminated unions
      const scalarTypes = ["string", "number", "integer", "boolean"];
      const allScalar = nonNull.every((t) => scalarTypes.includes(t));

      if (allScalar) {
        // Pick the most permissive type: prefer "string" if present, else first non-null
        const chosen = nonNull.includes("string") ? "string" : nonNull[0];
        if (chosen) {
          delete record.anyOf;
          record.type = chosen;
          if (hasNull) {
            record.nullable = true;
          }
        }
      }
    }

    // Handle object-union nullable pattern:
    // anyOf: [{type:object, props:{x: {type:null}}}, {type:object, props:{x: {type:object,...}}}]
    // → {type:object, props:{x: {..., nullable:true}}}
    if (
      variants.length === 2 &&
      variants.every(
        (v) =>
          v.type === "object" &&
          v.properties &&
          typeof v.properties === "object",
      )
    ) {
      const [a, b] = variants;
      const propsA = a.properties as Record<string, Record<string, unknown>>;
      const propsB = b.properties as Record<string, Record<string, unknown>>;
      const keysA = Object.keys(propsA);
      const keysB = Object.keys(propsB);

      // Same keys — try to merge nullable properties
      if (
        keysA.length === keysB.length &&
        keysA.every((k) => keysB.includes(k))
      ) {
        const merged: Record<string, Record<string, unknown>> = {};
        let canMerge = true;

        for (const key of keysA) {
          const valA = propsA[key];
          const valB = propsB[key];
          if (valA?.type === "null" && valB?.type !== "null") {
            merged[key] = { ...valB, nullable: true };
          } else if (valB?.type === "null" && valA?.type !== "null") {
            merged[key] = { ...valA, nullable: true };
          } else if (JSON.stringify(valA) === JSON.stringify(valB)) {
            merged[key] = valA;
          } else {
            canMerge = false;
            break;
          }
        }

        if (canMerge) {
          delete record.anyOf;
          record.type = "object";
          record.properties = merged;
          // Use required from the variant with the real types
          record.required = b.required ?? a.required;
          record.additionalProperties = false;
        }
      }
    }
  }

  for (const value of Object.values(record)) {
    simplifyAnyOfUnions(value);
  }
}

async function main() {
  const filePath = new URL(
    "../../../public/openapi.generated.json",
    import.meta.url,
  );
  const raw = await readFile(filePath, "utf8");
  const doc = JSON.parse(raw) as OpenApiDocument;

  if (!doc.paths || typeof doc.paths !== "object") {
    throw new Error("Invalid OpenAPI document: missing paths");
  }

  const paths = doc.paths;

  for (const [path, pathItem] of Object.entries(paths)) {
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

      // Rewrite operationId to Go-friendly camelCase names
      const currentId = (operation as { operationId?: string }).operationId;
      if (currentId) {
        (operation as { operationId?: string }).operationId =
          rewriteOperationId(method, path, currentId);
      }
    }
  }

  const sortedPaths = Object.fromEntries(
    Object.entries(paths)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== "object") {
          return [path, pathItem];
        }
        return [path, sortPathItemKeys(pathItem)];
      }),
  ) as NonNullable<OpenApiDocument["paths"]>;

  doc.paths = sortedPaths;
  patchRedirectOperations(sortedPaths);

  doc.tags = buildTopLevelTags(sortedPaths);

  // Fix OpenAPI 3.1-style exclusiveMinimum/exclusiveMaximum (number) to 3.0 (boolean)
  fixExclusiveMinMax(doc);

  // Inline $defs from Zod's JSON Schema output (not valid in OpenAPI 3.0)
  inlineDefs(doc);

  // Convert anyOf nullable patterns to OpenAPI 3.0 nullable: true
  fixAnyOfNullable(doc);

  // Simplify anyOf union types (e.g. string|number) to a single type for 3.0 compat
  simplifyAnyOfUnions(doc);

  await writeFile(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

await main();
