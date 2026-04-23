import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

type StoredObject = {
  body: Buffer;
  contentType: string;
};

const objects = new Map<string, StoredObject>();
let serverStarted = false;

const corsHeaders = {
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "PUT, HEAD, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers":
    "Content-Disposition, Content-Length, Content-Type, ETag",
};

function objectKeyFromRequest(request: IncomingMessage) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const [, bucket, ...keyParts] = url.pathname.split("/");
  if (!bucket || keyParts.length === 0) {
    return null;
  }

  return `${bucket}/${keyParts.map(decodeURIComponent).join("/")}`;
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sendNotFound(response: ServerResponse) {
  response.writeHead(404, {
    ...corsHeaders,
    "Content-Type": "application/xml",
  });
  response.end("<Error><Code>NoSuchKey</Code></Error>");
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const key = objectKeyFromRequest(request);
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (!key) {
    response.writeHead(400, corsHeaders);
    response.end();
    return;
  }

  if (request.method === "PUT") {
    const body = await readRequestBody(request);
    objects.set(key, {
      body,
      contentType:
        request.headers["content-type"]?.toString() ??
        "application/octet-stream",
    });
    response.writeHead(200, {
      ...corsHeaders,
      ETag: `"${Buffer.byteLength(body).toString(16)}"`,
    });
    response.end();
    return;
  }

  if (request.method === "HEAD") {
    const object = objects.get(key);
    if (!object) {
      sendNotFound(response);
      return;
    }
    response.writeHead(200, {
      ...corsHeaders,
      "Content-Length": object.body.byteLength,
      "Content-Type": object.contentType,
    });
    response.end();
    return;
  }

  if (request.method === "GET") {
    const object = objects.get(key);
    if (!object) {
      sendNotFound(response);
      return;
    }
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.writeHead(200, {
      ...corsHeaders,
      "Content-Length": object.body.byteLength,
      "Content-Type":
        url.searchParams.get("response-content-type") ?? object.contentType,
      ...(url.searchParams.has("response-content-disposition")
        ? {
            "Content-Disposition": url.searchParams.get(
              "response-content-disposition",
            ) as string,
          }
        : {}),
    });
    response.end(object.body);
    return;
  }

  if (request.method === "DELETE") {
    objects.delete(key);
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  response.writeHead(405, { ...corsHeaders, Allow: "PUT, HEAD, GET, DELETE" });
  response.end();
}

export async function startMockS3Server() {
  if (serverStarted) return;
  const endpoint = process.env.E2E_MOCK_S3_ENDPOINT;
  if (!endpoint) return;

  const url = new URL(endpoint);
  const host = url.hostname;
  const port = Number.parseInt(url.port, 10);
  if (!Number.isFinite(port)) {
    throw new Error(`E2E_MOCK_S3_ENDPOINT must include a port: ${endpoint}`);
  }

  await new Promise<void>((resolve, reject) => {
    const server = createServer((request, response) => {
      handleRequest(request, response).catch((error) => {
        response.writeHead(500, { "Content-Type": "text/plain" });
        response.end(error instanceof Error ? error.message : "Mock S3 error");
      });
    });
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      serverStarted = true;
      resolve();
    });
  });
}
