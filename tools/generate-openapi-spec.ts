/**
 * Custom OpenAPI spec generator replacing next-openapi-gen.
 *
 * Reads route files, extracts JSDoc annotations, and generates
 * public/openapi.generated.json in OpenAPI 3.0 format.
 * Then runs openapi-postprocess.ts to finalize the output.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import * as requestSchemas from "../src/lib/api/schemas/request-schemas";
import * as responseSchemas from "../src/lib/api/schemas/response-schemas";

const ROOT = new URL("..", import.meta.url).pathname;

type JsonSchema = Record<string, unknown>;

type OpenApiParameter = {
  in: "query" | "path";
  name: string;
  schema: JsonSchema;
  required: boolean;
  example?: string;
};

type OpenApiOperation = {
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: OpenApiParameter[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
};

type OpenApiPathItem = Record<string, OpenApiOperation>;

type OpenApiDocument = {
  openapi: string;
  info: unknown;
  servers: unknown[];
  paths: Record<string, OpenApiPathItem>;
  components: { schemas: Record<string, JsonSchema> };
};

// ── Schema registry ────────────────────────────────────────────────────────────

const allSchemas: Record<string, z.ZodTypeAny> = {};

for (const [name, value] of Object.entries(requestSchemas)) {
  if (value && typeof value === "object" && "_def" in value) {
    allSchemas[name] = value as z.ZodTypeAny;
  }
}
for (const [name, value] of Object.entries(responseSchemas)) {
  if (value && typeof value === "object" && "_def" in value) {
    allSchemas[name] = value as z.ZodTypeAny;
  }
}

function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  try {
    const result = z.toJSONSchema(schema, {
      cycles: "ref",
      unrepresentable: "any",
    }) as JsonSchema;
    const { $schema: _unused, ...rest } = result;
    return rest;
  } catch {
    return {};
  }
}

function getSchemaJsonSchema(name: string): JsonSchema {
  const schema = allSchemas[name];
  if (!schema) return {};
  return zodToJsonSchema(schema);
}

// ── Path parsing ───────────────────────────────────────────────────────────────

function filePathToApiPath(filePath: string): string {
  // filePath is relative to ROOT, e.g. "src/app/api/comments/[id]/route.ts"
  const relative = filePath
    .replace(/^src\/app/, "")
    .replace(/\/route\.ts$/, "");
  // Convert [param] and [...param] to {param}
  return relative
    .replace(/\[\.\.\.([^\]]+)\]/g, "{$1}")
    .replace(/\[([^\]]+)\]/g, "{$1}");
}

// ── JSDoc extraction ───────────────────────────────────────────────────────────

type HandlerAnnotations = {
  summary: string;
  params?: string; // schema name for query params
  pathParams?: string; // schema name for path params
  body?: string; // schema name for request body
  responses: Array<{ status: number | null; schemaName: string | null }>;
};

function extractJsDocAnnotations(
  source: string,
  httpMethod: string,
): HandlerAnnotations | null {
  // Find the exported handler function preceded by a JSDoc comment
  const pattern = new RegExp(
    `/\\*\\*[\\s\\S]*?\\*/\\s*export\\s+(?:async\\s+)?function\\s+${httpMethod}\\b`,
    "g",
  );
  const match = pattern.exec(source);
  if (!match) return null;

  const jsdoc = match[0];

  // Extract summary (first non-tag line)
  const summaryMatch = /\/\*\*\s*\n\s*\*\s*([^@\n][^\n]*)/.exec(jsdoc);
  const summary = summaryMatch
    ? `${summaryMatch[1].trim().replace(/\.$/, "")}.`
    : "";

  const annotations: HandlerAnnotations = { summary, responses: [] };

  // @params schemaName (query params)
  const paramsMatch = /@params\s+(\w+)/.exec(jsdoc);
  if (paramsMatch) annotations.params = paramsMatch[1];

  // @pathParams schemaName
  const pathParamsMatch = /@pathParams\s+(\w+)/.exec(jsdoc);
  if (pathParamsMatch) annotations.pathParams = pathParamsMatch[1];

  // @body schemaName
  const bodyMatch = /@body\s+(\w+)/.exec(jsdoc);
  if (bodyMatch) annotations.body = bodyMatch[1];

  // @response schemaName, @response statusCode:schemaName, or @response statusCode (redirect/empty)
  // Pattern: optional digits+colon prefix (status), then either word chars (schema) or end-of-context
  const responsePattern = /@response\s+(?:(\d+)(?::(\w+))?|(\w+))/g;
  let responseMatch = responsePattern.exec(jsdoc);
  while (responseMatch !== null) {
    if (responseMatch[1] !== undefined) {
      // Matched @response STATUS or @response STATUS:SCHEMA
      const status = Number.parseInt(responseMatch[1], 10);
      annotations.responses.push({
        status,
        schemaName: responseMatch[2] ?? null,
      });
    } else {
      // Matched @response SCHEMA (no explicit status code)
      annotations.responses.push({
        status: null,
        schemaName: responseMatch[3],
      });
    }
    responseMatch = responsePattern.exec(jsdoc);
  }

  return annotations;
}

// ── Parameter building ─────────────────────────────────────────────────────────

function buildParameters(annotations: HandlerAnnotations): OpenApiParameter[] {
  const params: OpenApiParameter[] = [];

  if (annotations.pathParams) {
    const jsonSchema = getSchemaJsonSchema(annotations.pathParams);
    const properties =
      (jsonSchema.properties as Record<string, JsonSchema>) ?? {};
    const required = (jsonSchema.required as string[]) ?? [];
    for (const [name, propSchema] of Object.entries(properties)) {
      params.push({
        in: "path",
        name,
        schema: { type: "string", ...propSchema },
        required: required.includes(name),
        example: "123",
      });
    }
  }

  if (annotations.params) {
    const jsonSchema = getSchemaJsonSchema(annotations.params);
    const properties =
      (jsonSchema.properties as Record<string, JsonSchema>) ?? {};
    const required = (jsonSchema.required as string[]) ?? [];
    for (const [name, propSchema] of Object.entries(properties)) {
      params.push({
        in: "query",
        name,
        schema: propSchema,
        required: required.includes(name),
      });
    }
  }

  return params;
}

// ── Response building ──────────────────────────────────────────────────────────

function buildResponses(
  annotations: HandlerAnnotations,
  usedSchemas: Set<string>,
): Record<string, unknown> {
  const responses: Record<string, unknown> = {};

  for (const { status, schemaName } of annotations.responses) {
    const code = status ?? 200;

    // Status-only annotation (e.g. @response 302) — redirect or empty body
    if (schemaName === null) {
      const isRedirect = code >= 300 && code < 400;
      responses[String(code)] = isRedirect
        ? {
            description: "Redirect",
            headers: {
              Location: { schema: { type: "string", format: "uri" } },
            },
          }
        : { description: `Response ${code}` };
      continue;
    }

    if (schemaName === "binary") {
      responses[String(code)] = {
        description: "Binary response",
        content: {
          "application/octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      };
      continue;
    }

    if (schemaName === "array") {
      responses[String(code)] = {
        description: "Array response",
        content: {
          "application/json": { schema: { type: "array", items: {} } },
        },
      };
      continue;
    }

    // schemaName is always a non-null string here; null case was handled above
    usedSchemas.add(schemaName as string);
    responses[String(code)] = {
      description: code === 200 ? "Successful response" : "Error response",
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${schemaName}` },
        },
      },
    };
  }

  // Default 200 only when the handler had no explicit @response annotations.
  if (Object.keys(responses).length === 0) {
    responses["200"] = {
      description: "Successful response",
      content: { "application/json": { schema: {} } },
    };
  }

  return responses;
}

// ── Request body building ─────────────────────────────────────────────────────

function buildRequestBody(
  annotations: HandlerAnnotations,
  usedSchemas: Set<string>,
): unknown {
  if (!annotations.body) return undefined;
  usedSchemas.add(annotations.body);
  return {
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${annotations.body}` },
      },
    },
  };
}

// ── Route file processing ─────────────────────────────────────────────────────

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

async function processRouteFile(
  filePath: string,
  usedSchemas: Set<string>,
): Promise<{ apiPath: string; pathItem: OpenApiPathItem } | null> {
  const source = await readFile(path.join(ROOT, filePath), "utf8");
  const apiPath = filePathToApiPath(filePath);

  const pathItem: OpenApiPathItem = {};

  for (const method of HTTP_METHODS) {
    // Check if the handler is exported (as function or const arrow)
    const isFunctionExport = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${method}\\b`,
    ).test(source);
    const isConstExport = new RegExp(`export\\s+const\\s+${method}\\s*=`).test(
      source,
    );
    if (!isFunctionExport && !isConstExport) {
      continue;
    }

    // Only try to extract JSDoc annotations from function exports (const arrows typically lack JSDoc)
    const annotations = isFunctionExport
      ? extractJsDocAnnotations(source, method)
      : null;
    if (!annotations) {
      // Handler exists but no JSDoc - create minimal operation
      const operationId = `${method.toLowerCase()}-${apiPath.replace(/\//g, "-").replace(/[{}]/g, "").replace(/^-/, "")}`;
      pathItem[method.toLowerCase()] = {
        operationId,
        summary: "",
        description: "",
        tags: [],
        parameters: [],
        responses: {
          "200": {
            description: "Successful response",
            content: { "application/json": { schema: {} } },
          },
        },
      };
      continue;
    }

    const operationId = `${method.toLowerCase()}-${apiPath.replace(/\//g, "-").replace(/[{}]/g, "").replace(/^-/, "")}`;
    const parameters = buildParameters(annotations);
    const responses = buildResponses(annotations, usedSchemas);
    const requestBody = buildRequestBody(annotations, usedSchemas);

    const operation: OpenApiOperation = {
      operationId,
      summary: annotations.summary,
      description: "",
      tags: [],
      parameters,
      responses,
    };

    if (requestBody) {
      (operation as Record<string, unknown>).requestBody = requestBody;
    }

    pathItem[method.toLowerCase()] = operation;
  }

  if (Object.keys(pathItem).length === 0) return null;
  return { apiPath, pathItem };
}

async function collectRouteFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(path.join(ROOT, dirPath), {
    withFileTypes: true,
  });

  const routeFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      routeFiles.push(...(await collectRouteFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "route.ts") {
      routeFiles.push(entryPath);
    }
  }

  return routeFiles;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const configPath = path.join(ROOT, "next.openapi.json");
  const config = JSON.parse(await readFile(configPath, "utf8")) as {
    openapi?: string;
    info?: { title: string; version: string; description?: string };
    servers?: Array<{ url: string; description?: string }>;
  };

  const usedSchemas = new Set<string>();

  // Find all route files, including hidden segments such as .well-known.
  const routeFiles = await collectRouteFiles("src/app");
  routeFiles.sort();

  const pathEntries: Array<[string, OpenApiPathItem]> = [];

  for (const filePath of routeFiles) {
    const result = await processRouteFile(filePath, usedSchemas);
    if (result) {
      pathEntries.push([result.apiPath, result.pathItem]);
    }
  }

  // Build component schemas for all used schema names
  const componentSchemas: Record<string, JsonSchema> = {};
  for (const name of usedSchemas) {
    componentSchemas[name] = getSchemaJsonSchema(name);
  }

  const doc: OpenApiDocument = {
    openapi: config.openapi ?? "3.0.0",
    info: config.info ?? {
      title: "Life@USTC API",
      version: "1.0.0",
      description: "OpenAPI document generated from Next.js routes",
    },
    servers: config.servers ?? [
      { url: "http://localhost:3000", description: "Local server" },
    ],
    paths: Object.fromEntries(pathEntries),
    components: { schemas: componentSchemas },
  };

  const outputPath = path.join(ROOT, "public/openapi.generated.json");
  await writeFile(outputPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(
    `Generated ${pathEntries.length} paths, ${usedSchemas.size} component schemas.`,
  );
  console.log(`Written to ${outputPath}`);
}

await main();
