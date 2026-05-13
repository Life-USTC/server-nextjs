import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleRouteError, jsonResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Get generated OpenAPI document.
 * @response openApiDocumentResponseSchema
 */
export async function GET() {
  try {
    const specPath = path.join(
      process.cwd(),
      "public",
      "openapi.generated.json",
    );
    const spec = await readFile(specPath, "utf-8");

    return jsonResponse(JSON.parse(spec));
  } catch (error) {
    return handleRouteError("Failed to read generated OpenAPI document", error);
  }
}
