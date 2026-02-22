import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Get generated OpenAPI document.
 * @response openApiDocumentResponseSchema
 */
export async function GET() {
  try {
    const specPath = join(process.cwd(), "public", "openapi.generated.json");
    const spec = await readFile(specPath, "utf-8");

    return NextResponse.json(JSON.parse(spec));
  } catch (error) {
    return handleRouteError("Failed to read generated OpenAPI document", error);
  }
}
