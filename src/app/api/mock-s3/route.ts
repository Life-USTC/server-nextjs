import { NextResponse } from "next/server";
import {
  deleteMockS3Object,
  getMockS3Object,
  putMockS3Object,
} from "@/lib/mock-s3";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function parseKey(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  return key;
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const key = parseKey(request);
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const url = new URL(request.url);
  const contentType =
    url.searchParams.get("contentType") ?? "application/octet-stream";
  const body = new Uint8Array(await request.arrayBuffer());
  putMockS3Object(key, { body, contentType });

  return NextResponse.json({ ok: true, size: body.byteLength });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const key = parseKey(request);
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const object = getMockS3Object(key);
  if (!object) {
    return notFound();
  }

  const url = new URL(request.url);
  const filename = url.searchParams.get("filename") ?? "download";

  const body = new Blob([object.body], { type: object.contentType });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": object.contentType,
      "content-length": String(object.body.byteLength),
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function HEAD(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const key = parseKey(request);
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const object = getMockS3Object(key);
  if (!object) {
    return notFound();
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "content-type": object.contentType,
      "content-length": String(object.body.byteLength),
    },
  });
}

export async function DELETE(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const key = parseKey(request);
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  deleteMockS3Object(key);
  return NextResponse.json({ ok: true });
}
