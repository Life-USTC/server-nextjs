import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBusTools } from "@/lib/mcp/tools/bus-tools";
import { registerCalendarTools } from "@/lib/mcp/tools/calendar-tools";
import { registerCourseTools } from "@/lib/mcp/tools/course-tools";
import { registerMyDataTools } from "@/lib/mcp/tools/my-data-tools";
import { registerProfileTools } from "@/lib/mcp/tools/profile-tools";
import { registerSectionDataTools } from "@/lib/mcp/tools/section-data-tools";

export function createMcpServer() {
  const server = new McpServer({
    name: "life-ustc-mcp",
    version: "1.0.0",
  });

  registerBusTools(server);
  registerProfileTools(server);
  registerCourseTools(server);
  registerSectionDataTools(server);
  registerMyDataTools(server);
  registerCalendarTools(server);

  return server;
}
