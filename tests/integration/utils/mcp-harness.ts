/**
 * MCP in-process harness.
 *
 * Creates a real McpServer connected to a real MCP Client via InMemoryTransport,
 * with a synthetic AuthInfo injected so tool handlers see an authenticated user.
 * No HTTP, no browser — just direct function call overhead.
 *
 * Usage:
 *   const { callTool, close } = await createMcpHarness(userId);
 *   try {
 *     const result = await callTool("get_my_profile");
 *     // result is the parsed JSON payload the tool returned
 *   } finally {
 *     await close();
 *   }
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * Build a minimal AuthInfo that makes tool handlers believe
 * `getUserId(extra.authInfo)` returns `userId`.
 */
export function makeTestAuthInfo(userId: string): AuthInfo {
  return {
    token: "integration-test-token",
    clientId: "integration-test-client",
    scopes: ["openid", "profile", "mcp:tools"],
    extra: { userId },
  };
}

export type McpHarness = {
  /** Call a tool by name with the given arguments, return the parsed JSON payload. */
  callTool(name: string, args?: Record<string, unknown>): Promise<unknown>;
  /** Typed convenience that calls callTool and casts the result. */
  call<T = Record<string, unknown>>(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<T>;
  /** Close the in-process MCP session. */
  close(): Promise<void>;
};

/**
 * Spin up an in-process MCP client + server pair authenticated as `userId`.
 *
 * The trick: `InMemoryTransport.createLinkedPair()` links two transports A and B
 * so that `A.send(msg, { authInfo })` calls `B.onmessage(msg, { authInfo })`.
 * We patch `clientTransport.send` to always inject the test AuthInfo, so every
 * MCP request the Client sends is seen by the Server as authenticated.
 */
export async function createMcpHarness(userId: string): Promise<McpHarness> {
  const authInfo = makeTestAuthInfo(userId);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  // Patch the client-side send to inject authInfo into every outgoing message.
  // InMemoryTransport.send(message, { authInfo }) forwards authInfo to the
  // other transport's onmessage handler — exactly what McpServer reads.
  const originalSend = clientTransport.send.bind(clientTransport);
  clientTransport.send = (
    message: JSONRPCMessage,
    options?: { relatedRequestId?: unknown },
  ) =>
    originalSend(message, { ...options, authInfo } as Parameters<
      typeof originalSend
    >[1]);

  const mcpServer = createMcpServer();
  const client = new Client({
    name: "integration-test-harness",
    version: "1.0.0",
  });

  await mcpServer.connect(serverTransport);
  await client.connect(clientTransport);

  function parseResult(
    result: Awaited<ReturnType<typeof client.callTool>>,
  ): unknown {
    const textItem = result.content.find(
      (c): c is { type: "text"; text: string } => c.type === "text",
    );
    if (!textItem) {
      throw new Error("MCP tool returned no text content");
    }
    return JSON.parse(textItem.text);
  }

  async function callTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const result = await client.callTool({ name, arguments: args });
    return parseResult(result);
  }

  async function call<T = Record<string, unknown>>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    return callTool(name, args) as Promise<T>;
  }

  async function close(): Promise<void> {
    await client.close();
  }

  return { callTool, call, close };
}
