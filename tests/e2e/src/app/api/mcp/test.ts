import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { expect, type Page, test } from "@playwright/test";
import { generateCodeChallenge } from "@/lib/oauth/utils";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import {
  createOAuthClientFixture,
  deleteOAuthClientFixture,
  getCurrentSessionUser,
  PLAYWRIGHT_BASE_URL,
} from "../../../../utils/e2e-db";

async function issueCode(
  page: Page,
  client: Awaited<ReturnType<typeof createOAuthClientFixture>>,
  options: {
    scope: string;
    codeChallenge?: string;
    resource?: string;
  },
) {
  const authorizeResponse = await page.request.post("/api/oauth/authorize", {
    data: {
      client_id: client.clientId,
      redirect_uri: client.redirectUris[0],
      scope: options.scope,
      code_challenge: options.codeChallenge,
      code_challenge_method: options.codeChallenge ? "S256" : undefined,
      resource: options.resource,
    },
  });

  expect(authorizeResponse.status()).toBe(200);
  const redirect = ((await authorizeResponse.json()) as { redirect?: string })
    .redirect;
  expect(redirect).toBeTruthy();

  const code = new URL(redirect ?? "").searchParams.get("code");
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
  },
) {
  const client = await createOAuthClientFixture({
    scopes: options.clientScopes,
    tokenEndpointAuthMethod: "none",
    redirectUris: [`${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`],
  });

  const codeVerifier =
    "mcp-public-client-verifier-012345678901234567890123456789";
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const code = await issueCode(page, client, {
    scope: options.scope,
    codeChallenge,
    resource: options.resource,
  });

  const tokenResponse = await request.post("/api/oauth/token", {
    data: {
      grant_type: "authorization_code",
      client_id: client.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: client.redirectUris[0],
      resource: options.resource,
    },
  });

  expect(tokenResponse.status()).toBe(200);
  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
  };
  expect(typeof tokenBody.access_token).toBe("string");

  return {
    client,
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

  const { client, accessToken } = await issueAccessToken(page, request, {
    scope: "openid profile",
    clientScopes: ["openid", "profile"],
    resource,
  });

  try {
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
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

test("OAuth PKCE token can connect to /api/mcp and call all seeded tools", async ({
  page,
  request,
}) => {
  const resource = `${PLAYWRIGHT_BASE_URL}/api/mcp`;
  await signInAsDebugUser(page, "/");
  const currentUser = await getCurrentSessionUser(page);
  const { client, accessToken } = await issueAccessToken(page, request, {
    scope: "openid profile mcp:tools",
    clientScopes: ["openid", "profile", "mcp:tools"],
    resource,
  });

  try {
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
          "search_courses",
          "get_section_by_jw_id",
          "list_homeworks_by_section",
          "list_schedules_by_section",
          "list_exams_by_section",
        ]),
      );

      const profileResult = await mcpClient.callTool({
        name: "get_my_profile",
        arguments: {},
      });
      const profile = parseTextContent(profileResult) as {
        id?: string;
        username?: string | null;
      };
      expect(profile.id).toBe(currentUser.id);
      expect(profile.username).toBe(currentUser.username ?? null);

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
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});
