import {
  getActiveScheduleConfig,
  getAllScheduleConfigs,
  getScheduleConfigById,
} from "@/features/bus-schedule/server/bus-schedule-server";
import { handleRouteError, jsonResponse, notFound } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Get bus schedule data.
 * If `id` is provided, returns a specific config.
 * If `active=true` (default), returns the currently active config.
 * If `all=true`, returns all configs.
 * @response busScheduleResponseSchema
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (idParam) {
      const id = Number.parseInt(idParam, 10);
      if (Number.isNaN(id)) {
        return jsonResponse({ error: "Invalid id parameter" }, { status: 400 });
      }
      const config = await getScheduleConfigById(id);
      if (!config) {
        return notFound("Bus schedule config not found");
      }
      return jsonResponse({ config });
    }

    if (all) {
      const configs = await getAllScheduleConfigs();
      return jsonResponse({ configs });
    }

    const config = await getActiveScheduleConfig();
    if (!config) {
      return jsonResponse({ config: null });
    }
    return jsonResponse({ config });
  } catch (error) {
    return handleRouteError("Failed to fetch bus schedule", error);
  }
}
