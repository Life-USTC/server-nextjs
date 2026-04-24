import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSectionHomeworkTools } from "@/lib/mcp/tools/section-data/homework-tools";
import { registerSectionRecordTools } from "@/lib/mcp/tools/section-data/record-tools";

export function registerSectionDataTools(server: McpServer) {
  registerSectionHomeworkTools(server);
  registerSectionRecordTools(server);
}
