import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium } from "@playwright/test";
import { DEV_SEED } from "../seed/dev-seed";

function generateCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasContentArray(
  value: unknown,
): value is { content: Array<{ type: string; text?: string }> } {
  return (
    isRecord(value) &&
    Array.isArray(value.content) &&
    value.content.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.type === "string" &&
        (entry.text === undefined || typeof entry.text === "string"),
    )
  );
}

function pickTextContent(result: unknown) {
  const contentSource = hasContentArray(result)
    ? result
    : isRecord(result) && hasContentArray(result.toolResult)
      ? result.toolResult
      : null;
  if (!contentSource)
    throw new Error("Missing content array in MCP tool result");

  const item = contentSource.content.find(
    (entry): entry is { type: "text"; text: string } =>
      entry.type === "text" && typeof entry.text === "string",
  );
  if (!item) throw new Error("Missing text content in MCP tool result");
  return item.text;
}

async function main() {
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";
  const resource = `${baseUrl}/api/mcp`;
  const redirectUri = `${baseUrl}/e2e/oauth/callback`;
  const headers = { Origin: baseUrl, Referer: `${baseUrl}/` };

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();

  try {
    await page.goto(`/signin?callbackUrl=${encodeURIComponent("/")}`);
    await page
      .getByRole("button", { name: /Debug User \(Dev\)|调试用户（开发）/i })
      .first()
      .click();
    await page.waitForURL("**/");

    const registerRes = await page.request.post("/api/auth/oauth2/register", {
      data: {
        client_name: `mcp-dump-${Date.now()}`,
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
        response_types: ["code"],
        scope: "openid profile mcp:tools",
      },
      headers,
    });
    if (registerRes.status() !== 200) {
      throw new Error(
        `OAuth register failed: ${registerRes.status()} ${await registerRes.text()}`,
      );
    }
    const { client_id: clientId } = (await registerRes.json()) as {
      client_id?: string;
    };
    if (!clientId) throw new Error("OAuth register response missing client_id");

    const codeVerifier =
      "mcp-dump-public-client-verifier-012345678901234567890123456789";
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const authorizeRes = await page.request.get("/api/auth/oauth2/authorize", {
      params: {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "openid profile mcp:tools",
        state: `mcp-dump-state-${Date.now()}`,
        prompt: "consent",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        resource,
      },
      maxRedirects: 0,
      headers,
    });
    if (authorizeRes.status() !== 302) {
      throw new Error(
        `OAuth authorize failed: ${authorizeRes.status()} ${await authorizeRes.text()}`,
      );
    }

    await page.goto(authorizeRes.headers().location ?? "");
    // The consent UI may redirect to /signin?callbackUrl=<authorize_url> when session is not detected yet.
    if (/\/signin\?callbackUrl=/.test(page.url())) {
      await page
        .getByRole("button", { name: /调试用户（开发）/i })
        .first()
        .click();
    }
    await page.waitForURL("**/oauth/authorize**", { timeout: 120_000 });

    const current = new URL(page.url());
    if (current.hostname !== "127.0.0.1" && current.hostname !== "localhost") {
      throw new Error(`Unexpected navigation to ${current.toString()}`);
    }

    // Consent button labels differ across locales / UI variants; try multiple strategies.
    const approveByText = page.getByRole("button", {
      name: /allow|approve|authorize|同意|允许|授权/i,
    });

    // Some builds show login options inside /oauth/authorize; prefer dev debug login, never SSO.
    if ((await approveByText.count()) === 0) {
      const debugLogin = page
        .getByRole("button", { name: /调试用户（开发）/i })
        .first();
      await debugLogin.waitFor({ state: "visible", timeout: 60_000 });
      await debugLogin.click({ timeout: 60_000 });
    }

    const approve = approveByText.first();
    await approve.waitFor({ state: "visible", timeout: 60_000 });
    await approve.click({ timeout: 60_000 });
    await page.waitForURL("**/e2e/oauth/callback**", { timeout: 120_000 });

    const callbackUrl = new URL(page.url());
    const code = callbackUrl.searchParams.get("code");
    if (!code) throw new Error("OAuth callback missing code");

    const tokenRes = await page.request.post("/api/auth/oauth2/token", {
      form: {
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        resource,
      },
      headers,
    });
    if (tokenRes.status() !== 200) {
      throw new Error(
        `OAuth token failed: ${tokenRes.status()} ${await tokenRes.text()}`,
      );
    }
    const { access_token: accessToken } = (await tokenRes.json()) as {
      access_token?: string;
    };
    if (!accessToken)
      throw new Error("OAuth token response missing access_token");

    const transport = new StreamableHTTPClientTransport(new URL(resource), {
      requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const mcpClient = new Client({
      name: "life-ustc-mcp-dump",
      version: "1.0.0",
    });

    try {
      await mcpClient.connect(transport);
      const listed = await mcpClient.listTools();

      console.log(`MCP endpoint: ${resource}`);
      console.log(
        `Seed user: ${DEV_SEED.debugUsername} (${DEV_SEED.debugName})`,
      );
      console.log(
        `Tools (${listed.tools.length}): ${listed.tools.map((t) => t.name).join(", ")}`,
      );
      console.log("");

      const dump = async (name: string, args: Record<string, unknown>) => {
        const result = await mcpClient.callTool({ name, arguments: args });
        const text = pickTextContent(result);
        console.log(`## ${name}`);
        console.log(text);
        console.log("");
        return text;
      };

      await dump("get_my_profile", {});
      await dump("list_my_todos", {});
      await dump("search_courses", {
        search: DEV_SEED.course.code,
        limit: 5,
        locale: "zh-cn",
      });
      await dump("get_section_by_jw_id", {
        jwId: DEV_SEED.section.jwId,
        locale: "zh-cn",
      });
      await dump("match_section_codes", {
        codes: [DEV_SEED.section.code, "NOT-EXIST-CODE"],
        locale: "zh-cn",
      });
      await dump("list_homeworks_by_section", {
        sectionJwId: DEV_SEED.section.jwId,
        includeDeleted: false,
        locale: "zh-cn",
      });
      await dump("list_schedules_by_section", {
        sectionJwId: DEV_SEED.section.jwId,
        limit: 5,
        locale: "zh-cn",
      });
      await dump("list_exams_by_section", {
        sectionJwId: DEV_SEED.section.jwId,
        locale: "zh-cn",
      });
      await dump("list_my_homeworks", {
        completed: false,
        limit: 10,
        locale: "zh-cn",
      });
      await dump("list_my_schedules", { limit: 10, locale: "zh-cn" });
      await dump("list_my_exams", {
        includeDateUnknown: true,
        limit: 10,
        locale: "zh-cn",
      });
      await dump("get_my_overview", { locale: "zh-cn" });
      await dump("get_my_7days_timeline", { locale: "zh-cn" });
      await dump("get_my_calendar_subscription", { locale: "zh-cn" });
      await dump("subscribe_my_sections_by_codes", {
        codes: [DEV_SEED.section.code],
        locale: "zh-cn",
      });
    } finally {
      await transport.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
