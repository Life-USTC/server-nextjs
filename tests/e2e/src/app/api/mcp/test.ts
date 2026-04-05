/**
 * E2E tests for `POST /api/mcp` — Model Context Protocol Streamable-HTTP transport.
 *
 * Route behaviour (src/app/api/mcp/route.ts):
 *   - Requires an OAuth 2.0 Bearer token with the `mcp:tools` scope.
 *   - Returns a 401 with `WWW-Authenticate: Bearer` when no token is present.
 *   - Returns a 403 `insufficient_scope` when the token lacks `mcp:tools`.
 *   - Once authenticated, exposes 20+ tools via MCP protocol (homeworks, todos, buses, etc.).
 *
 * Tests exercise:
 *   1. Unauthenticated request → 401 Bearer challenge.
 *   2. Token without `mcp:tools` scope → 403 insufficient_scope.
 *   3. Opaque access-token (no resource indicator) → successful MCP session.
 *   4. Full PKCE flow with resource indicator → MCP session + calls every seeded tool.
 */
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { expect, type Page, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import {
  getCurrentSessionUser,
  PLAYWRIGHT_BASE_URL,
} from "../../../../utils/e2e-db";

function generateCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

const REDIRECT_URI = `${PLAYWRIGHT_BASE_URL}/e2e/oauth/callback`;

async function registerPublicClient(request: Page["request"], scope: string) {
  const response = await request.post("/api/auth/oauth2/register", {
    data: {
      client_name: `mcp-e2e-${Date.now()}`,
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
      scope,
    },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { client_id?: string };
  expect(typeof body.client_id).toBe("string");
  return body.client_id as string;
}

async function authorizeAndGetCode(
  page: Page,
  clientId: string,
  options: {
    scope: string;
    codeChallenge?: string;
    resource?: string;
  },
) {
  const authorizeResponse = await page.request.get(
    "/api/auth/oauth2/authorize",
    {
      params: {
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        scope: options.scope,
        state: `mcp-e2e-state-${Date.now()}`,
        prompt: "consent",
        ...(options.codeChallenge
          ? {
              code_challenge: options.codeChallenge,
              code_challenge_method: "S256",
            }
          : {}),
        ...(options.resource ? { resource: options.resource } : {}),
      },
      maxRedirects: 0,
    },
  );

  expect(authorizeResponse.status()).toBe(302);
  const consentLocation = authorizeResponse.headers().location;
  expect(typeof consentLocation).toBe("string");
  expect(consentLocation).toContain("/oauth/authorize?");

  await page.goto(consentLocation);
  await page.getByRole("button", { name: /allow/i }).click();
  await page.waitForURL("**/e2e/oauth/callback**");

  const callbackUrl = new URL(page.url());
  const code = callbackUrl.searchParams.get("code");
  expect(typeof code).toBe("string");
  return code as string;
}

async function issueAccessToken(
  page: Page,
  request: Page["request"],
  options: {
    scope: string;
    clientScopes: string[];
    resource?: string;
    /** Omit `resource` on token exchange → opaque access token (ChatGPT-style). */
    includeResourceInTokenExchange?: boolean;
  },
) {
  const clientId = await registerPublicClient(
    request,
    options.clientScopes.join(" "),
  );

  const codeVerifier =
    "mcp-public-client-verifier-012345678901234567890123456789";
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const code = await authorizeAndGetCode(page, clientId, {
    scope: options.scope,
    codeChallenge,
    resource: options.resource,
  });

  const includeResourceInToken =
    options.includeResourceInTokenExchange !== false && options.resource;

  const tokenResponse = await request.post("/api/auth/oauth2/token", {
    form: {
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: REDIRECT_URI,
      ...(includeResourceInToken ? { resource: options.resource } : {}),
    },
  });

  expect(tokenResponse.status()).toBe(200);
  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
  };
  expect(typeof tokenBody.access_token).toBe("string");

  return {
    clientId,
    accessToken: tokenBody.access_token as string,
  };
}

function parseTextContent(result: {
  content: Array<{ type: string; text?: string }>;
}) {
  const textContent = result.content.find(
    (item): item is { type: "text"; text: string } => item.type === "text",
  );
  expect(textContent).toBeDefined();
  return JSON.parse(textContent?.text ?? "{}") as Record<string, unknown>;
}

test.describe("/api/mcp – MCP Streamable-HTTP transport", () => {
  test("/api/mcp 未认证时返回 OAuth bearer challenge", async ({ request }) => {
    const response = await request.post("/api/mcp", {
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: {
            name: "unauthenticated-e2e-client",
            version: "1.0.0",
          },
        },
      },
      headers: {
        "MCP-Protocol-Version": "2025-03-26",
      },
    });

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain(
      "resource_metadata=",
    );
    await expect(response.json()).resolves.toEqual({ error: "invalid_token" });
  });

  test("/api/mcp 缺少 mcp:tools scope 时返回 insufficient_scope", async ({
    page,
    request,
  }) => {
    const resource = `${PLAYWRIGHT_BASE_URL}/api/mcp`;
    await signInAsDebugUser(page, "/");

    const { accessToken } = await issueAccessToken(page, request, {
      scope: "openid profile",
      clientScopes: ["openid", "profile"],
      resource,
    });

    const response = await request.post("/api/mcp", {
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: {
            name: "insufficient-scope-e2e-client",
            version: "1.0.0",
          },
        },
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "MCP-Protocol-Version": "2025-03-26",
      },
    });

    expect(response.status()).toBe(403);
    expect(response.headers()["www-authenticate"]).toContain(
      'error="insufficient_scope"',
    );
    expect(response.headers()["www-authenticate"]).toContain(
      'scope="mcp:tools"',
    );
    await expect(response.json()).resolves.toEqual({
      error: "insufficient_scope",
    });
  });

  test("opaque access token (no resource on token exchange) can connect to /api/mcp", async ({
    page,
    request,
  }) => {
    const resource = `${PLAYWRIGHT_BASE_URL}/api/mcp`;
    await signInAsDebugUser(page, "/");

    const { accessToken } = await issueAccessToken(page, request, {
      scope: "openid profile mcp:tools",
      clientScopes: ["openid", "profile", "mcp:tools"],
      resource,
      includeResourceInTokenExchange: false,
    });

    expect(accessToken.split(".").length).toBeLessThan(3);

    const transport = new StreamableHTTPClientTransport(new URL(resource), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    const mcpClient = new Client({
      name: "opaque-token-e2e-client",
      version: "1.0.0",
    });

    try {
      await mcpClient.connect(transport);
      const tools = await mcpClient.listTools();
      expect(tools.tools.some((t) => t.name === "get_my_profile")).toBe(true);
    } finally {
      await transport.close();
    }
  });

  test("OAuth PKCE token can connect to /api/mcp and call all seeded tools", async ({
    page,
    request,
  }) => {
    const resource = `${PLAYWRIGHT_BASE_URL}/api/mcp`;
    await signInAsDebugUser(page, "/");
    const currentUser = await getCurrentSessionUser(page);
    const { accessToken } = await issueAccessToken(page, request, {
      scope: "openid profile mcp:tools",
      clientScopes: ["openid", "profile", "mcp:tools"],
      resource,
    });

    const metadataResponse = await request.get(
      "/.well-known/oauth-authorization-server",
    );
    expect(metadataResponse.status()).toBe(200);

    const transport = new StreamableHTTPClientTransport(new URL(resource), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    const mcpClient = new Client({
      name: "life-ustc-e2e-client",
      version: "1.0.0",
    });

    try {
      await mcpClient.connect(transport);

      const tools = await mcpClient.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          "get_my_profile",
          "list_my_todos",
          "create_my_todo",
          "update_my_todo",
          "delete_my_todo",
          "list_my_homeworks",
          "set_my_homework_completion",
          "list_my_schedules",
          "list_my_exams",
          "get_my_overview",
          "get_my_7days_timeline",
          "search_courses",
          "match_section_codes",
          "get_my_calendar_subscription",
          "subscribe_my_sections_by_codes",
          "get_section_by_jw_id",
          "list_homeworks_by_section",
          "list_schedules_by_section",
          "list_exams_by_section",
          "query_bus_timetable",
        ]),
      );
      expect(tools.tools.map((tool) => tool.name)).not.toEqual(
        expect.arrayContaining([
          "list_comments",
          "create_comment",
          "set_comment_reaction",
        ]),
      );

      const profileResult = await mcpClient.callTool({
        name: "get_my_profile",
        arguments: {},
      });
      const profile = parseTextContent(profileResult) as {
        id?: string;
        username?: string | null;
        createdAt?: string;
      };
      expect(profile.id).toBe(currentUser.id);
      expect(profile.username).toBe(currentUser.username ?? null);
      expect(typeof profile.createdAt).toBe("string");
      expect(profile.createdAt).toMatch(/\+08:00$/);

      const todosResult = await mcpClient.callTool({
        name: "list_my_todos",
        arguments: {},
      });
      const todosPayload = parseTextContent(todosResult) as {
        todos?: Array<{ title?: string; completed?: boolean }>;
      };
      expect(
        todosPayload.todos?.some(
          (todo) =>
            todo.title === DEV_SEED.todos.dueTodayTitle &&
            todo.completed === false,
        ),
      ).toBe(true);

      const coursesResult = await mcpClient.callTool({
        name: "search_courses",
        arguments: {
          search: DEV_SEED.course.code,
          limit: 5,
          locale: "zh-cn",
        },
      });
      const coursesPayload = parseTextContent(coursesResult) as {
        courses?: Array<{
          jwId?: number;
          code?: string | null;
          namePrimary?: string | null;
        }>;
      };
      expect(
        coursesPayload.courses?.some(
          (course) =>
            course.jwId === DEV_SEED.course.jwId &&
            course.code === DEV_SEED.course.code &&
            course.namePrimary === DEV_SEED.course.nameCn,
        ),
      ).toBe(true);

      const sectionResult = await mcpClient.callTool({
        name: "get_section_by_jw_id",
        arguments: {
          jwId: DEV_SEED.section.jwId,
          locale: "zh-cn",
        },
      });
      const sectionPayload = parseTextContent(sectionResult) as {
        found?: boolean;
        section?: {
          id?: number;
          jwId?: number;
          code?: string | null;
          course?: { code?: string | null; namePrimary?: string | null };
        };
      };
      expect(sectionPayload.found).toBe(true);
      expect(sectionPayload.section?.jwId).toBe(DEV_SEED.section.jwId);
      expect(sectionPayload.section?.code).toBe(DEV_SEED.section.code);
      expect(sectionPayload.section?.course?.code).toBe(DEV_SEED.course.code);
      expect(sectionPayload.section?.course?.namePrimary).toBe(
        DEV_SEED.course.nameCn,
      );

      const homeworksResult = await mcpClient.callTool({
        name: "list_homeworks_by_section",
        arguments: {
          sectionJwId: DEV_SEED.section.jwId,
          includeDeleted: false,
          locale: "zh-cn",
        },
      });
      const homeworksPayload = parseTextContent(homeworksResult) as {
        found?: boolean;
        section?: { jwId?: number };
        homeworks?: Array<{ title?: string }>;
      };
      expect(homeworksPayload.found).toBe(true);
      expect(homeworksPayload.section?.jwId).toBe(DEV_SEED.section.jwId);
      expect(
        homeworksPayload.homeworks?.some(
          (homework) => homework.title === DEV_SEED.homeworks.title,
        ),
      ).toBe(true);

      const schedulesResult = await mcpClient.callTool({
        name: "list_schedules_by_section",
        arguments: {
          sectionJwId: DEV_SEED.section.jwId,
          limit: 20,
          locale: "zh-cn",
        },
      });
      const schedulesPayload = parseTextContent(schedulesResult) as {
        found?: boolean;
        section?: { jwId?: number };
        schedules?: Array<{ id?: number }>;
      };
      expect(schedulesPayload.found).toBe(true);
      expect(schedulesPayload.section?.jwId).toBe(DEV_SEED.section.jwId);
      expect((schedulesPayload.schedules?.length ?? 0) > 0).toBe(true);

      const examsResult = await mcpClient.callTool({
        name: "list_exams_by_section",
        arguments: {
          sectionJwId: DEV_SEED.section.jwId,
          locale: "zh-cn",
        },
      });
      const examsPayload = parseTextContent(examsResult) as {
        found?: boolean;
        section?: { jwId?: number };
        exams?: Array<{ id?: number }>;
      };
      expect(examsPayload.found).toBe(true);
      expect(examsPayload.section?.jwId).toBe(DEV_SEED.section.jwId);
      expect((examsPayload.exams?.length ?? 0) > 0).toBe(true);

      const myHomeworksResult = await mcpClient.callTool({
        name: "list_my_homeworks",
        arguments: {
          completed: false,
          limit: 30,
          locale: "zh-cn",
        },
      });
      const myHomeworksPayload = parseTextContent(myHomeworksResult) as {
        homeworks?: Array<{ id?: string; title?: string }>;
      };
      expect(
        myHomeworksPayload.homeworks?.some(
          (homework) => homework.title === DEV_SEED.homeworks.title,
        ),
      ).toBe(true);
      const firstHomeworkId = myHomeworksPayload.homeworks?.[0]?.id;
      expect(typeof firstHomeworkId).toBe("string");

      const setCompletionTrueResult = await mcpClient.callTool({
        name: "set_my_homework_completion",
        arguments: {
          homeworkId: firstHomeworkId,
          completed: true,
        },
      });
      const setCompletionTruePayload = parseTextContent(
        setCompletionTrueResult,
      ) as {
        success?: boolean;
        completion?: { completed?: boolean };
      };
      expect(setCompletionTruePayload.success).toBe(true);
      expect(setCompletionTruePayload.completion?.completed).toBe(true);

      const setCompletionFalseResult = await mcpClient.callTool({
        name: "set_my_homework_completion",
        arguments: {
          homeworkId: firstHomeworkId,
          completed: false,
        },
      });
      const setCompletionFalsePayload = parseTextContent(
        setCompletionFalseResult,
      ) as {
        success?: boolean;
        completion?: { completed?: boolean };
      };
      expect(setCompletionFalsePayload.success).toBe(true);
      expect(setCompletionFalsePayload.completion?.completed).toBe(false);

      const mySchedulesResult = await mcpClient.callTool({
        name: "list_my_schedules",
        arguments: {
          limit: 30,
          locale: "zh-cn",
        },
      });
      const mySchedulesPayload = parseTextContent(mySchedulesResult) as {
        schedules?: Array<{ id?: number }>;
      };
      expect((mySchedulesPayload.schedules?.length ?? 0) > 0).toBe(true);

      const myExamsResult = await mcpClient.callTool({
        name: "list_my_exams",
        arguments: {
          includeDateUnknown: true,
          limit: 30,
          locale: "zh-cn",
        },
      });
      const myExamsPayload = parseTextContent(myExamsResult) as {
        exams?: Array<{ id?: number }>;
      };
      expect((myExamsPayload.exams?.length ?? 0) > 0).toBe(true);

      const overviewResult = await mcpClient.callTool({
        name: "get_my_overview",
        arguments: {
          locale: "zh-cn",
        },
      });
      const overviewPayload = parseTextContent(overviewResult) as {
        overview?: {
          pendingTodosCount?: number;
          pendingHomeworksCount?: number;
          todaySchedulesCount?: number;
          upcomingExamsCount?: number;
        };
      };
      expect(typeof overviewPayload.overview?.pendingTodosCount).toBe("number");
      expect(typeof overviewPayload.overview?.pendingHomeworksCount).toBe(
        "number",
      );
      expect(typeof overviewPayload.overview?.todaySchedulesCount).toBe(
        "number",
      );
      expect(typeof overviewPayload.overview?.upcomingExamsCount).toBe(
        "number",
      );

      const timelineResult = await mcpClient.callTool({
        name: "get_my_7days_timeline",
        arguments: {
          locale: "zh-cn",
        },
      });
      const timelinePayload = parseTextContent(timelineResult) as {
        total?: number;
        range?: { from?: string; to?: string };
        events?: Array<{ type?: string; at?: string | null }>;
      };
      expect(typeof timelinePayload.total).toBe("number");
      expect(timelinePayload.range?.from).toMatch(/\+08:00$/);
      expect(timelinePayload.range?.to).toMatch(/\+08:00$/);
      expect((timelinePayload.events?.length ?? 0) > 0).toBe(true);
      expect(
        timelinePayload.events?.some(
          (event) => typeof event.at === "string" && /\+08:00$/.test(event.at),
        ),
      ).toBe(true);
      expect(
        timelinePayload.events?.some((event) =>
          ["schedule", "homework_due", "exam", "todo_due"].includes(
            event.type ?? "",
          ),
        ),
      ).toBe(true);

      const matchSectionCodesResult = await mcpClient.callTool({
        name: "match_section_codes",
        arguments: {
          codes: [DEV_SEED.section.code, "NOT-EXIST-CODE"],
          locale: "zh-cn",
        },
      });
      const matchSectionCodesPayload = parseTextContent(
        matchSectionCodesResult,
      ) as {
        success?: boolean;
        matchedCodes?: string[];
        unmatchedCodes?: string[];
      };
      expect(matchSectionCodesPayload.success).toBe(true);
      expect(matchSectionCodesPayload.matchedCodes).toContain(
        DEV_SEED.section.code,
      );
      expect(matchSectionCodesPayload.unmatchedCodes).toContain(
        "NOT-EXIST-CODE",
      );

      const busResult = await mcpClient.callTool({
        name: "query_bus_timetable",
        arguments: {
          locale: "zh-cn",
          originCampusId: DEV_SEED.bus.originCampusId,
          destinationCampusId: DEV_SEED.bus.destinationCampusId,
        },
      });
      const busPayload = parseTextContent(busResult) as {
        todayType?: string;
        version?: { title?: string | null };
        recommended?: { route?: { id?: number } | null } | null;
        matches?: Array<{ route?: { id?: number } | null }>;
      };
      expect(
        busPayload.todayType === "weekday" ||
          busPayload.todayType === "weekend",
      ).toBe(true);
      expect(busPayload.version?.title).toContain(DEV_SEED.bus.versionTitle);
      expect(busPayload.recommended).not.toBeNull();
      expect(
        busPayload.matches?.some(
          (match) => match.route?.id === DEV_SEED.bus.routeId,
        ),
      ).toBe(true);

      const todoTitle = `[MCP-E2E-TODO] ${Date.now()}`;
      const createTodoResult = await mcpClient.callTool({
        name: "create_my_todo",
        arguments: {
          title: todoTitle,
          content: "todo created by mcp e2e",
          priority: "medium",
          dueAt: new Date().toISOString(),
        },
      });
      const createTodoPayload = parseTextContent(createTodoResult) as {
        success?: boolean;
        id?: string;
      };
      expect(createTodoPayload.success).toBe(true);
      expect(typeof createTodoPayload.id).toBe("string");

      const updateTodoResult = await mcpClient.callTool({
        name: "update_my_todo",
        arguments: {
          id: createTodoPayload.id,
          title: `${todoTitle}-updated`,
          completed: true,
        },
      });
      const updateTodoPayload = parseTextContent(updateTodoResult) as {
        success?: boolean;
      };
      expect(updateTodoPayload.success).toBe(true);

      const deleteTodoResult = await mcpClient.callTool({
        name: "delete_my_todo",
        arguments: {
          id: createTodoPayload.id,
        },
      });
      const deleteTodoPayload = parseTextContent(deleteTodoResult) as {
        success?: boolean;
      };
      expect(deleteTodoPayload.success).toBe(true);

      const calendarSubscriptionResult = await mcpClient.callTool({
        name: "get_my_calendar_subscription",
        arguments: {
          locale: "zh-cn",
        },
      });
      const calendarSubscriptionPayload = parseTextContent(
        calendarSubscriptionResult,
      ) as {
        success?: boolean;
        subscription?: {
          userId?: string;
          sections?: Array<{ id?: number }>;
          calendarPath?: string;
        };
      };
      expect(calendarSubscriptionPayload.success).toBe(true);
      expect(calendarSubscriptionPayload.subscription?.userId).toBe(
        currentUser.id,
      );
      expect(
        (calendarSubscriptionPayload.subscription?.sections?.length ?? 0) > 0,
      ).toBe(true);
      expect(calendarSubscriptionPayload.subscription?.calendarPath).toContain(
        "/api/users/",
      );

      const subscribeResult = await mcpClient.callTool({
        name: "subscribe_my_sections_by_codes",
        arguments: {
          codes: [DEV_SEED.section.code],
          locale: "zh-cn",
        },
      });
      const subscribePayload = parseTextContent(subscribeResult) as {
        success?: boolean;
        matchedCodes?: string[];
      };
      expect(subscribePayload.success).toBe(true);
      expect(subscribePayload.matchedCodes).toContain(DEV_SEED.section.code);

      const missingSectionResult = await mcpClient.callTool({
        name: "get_section_by_jw_id",
        arguments: {
          jwId: 999999999,
          locale: "zh-cn",
        },
      });
      const missingSectionPayload = parseTextContent(missingSectionResult) as {
        found?: boolean;
        message?: string;
      };
      expect(missingSectionPayload.found).toBe(false);
      expect(missingSectionPayload.message).toContain("999999999");
    } finally {
      await transport.close();
    }
  });
});
