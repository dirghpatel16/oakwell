import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROOTS = new Set([
  "analyze-deal",
  "generate-email",
  "live-snippet",
  "deal-status",
  "proof",
  "health",
  "storage-status",
  "sentinel-status",
  "memory",
  "competitor-trend",
  "executive-summary",
  "record-outcome",
  "winning-patterns",
]);

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const [root] = path;

  if (!root || !ALLOWED_ROOTS.has(root)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const backendUrl = process.env.OAKWELL_BACKEND_URL;
  const internalSecret = process.env.OAKWELL_INTERNAL_API_SECRET;

  if (!backendUrl || !internalSecret) {
    return NextResponse.json(
      { error: "Backend proxy is not configured. Set OAKWELL_BACKEND_URL and OAKWELL_INTERNAL_API_SECRET." },
      { status: 500 },
    );
  }

  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = new URL(path.join("/"), backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set("X-Oakwell-Internal-Secret", internalSecret);
  headers.set("X-Oakwell-User-Id", userId);
  if (orgId) {
    headers.set("X-Oakwell-Org-Id", orgId);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  if (body && body.length > 25000) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  if (request.method === "POST" && !contentType?.includes("application/json")) {
    return NextResponse.json({ error: "Only JSON requests are supported" }, { status: 415 });
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseContentType = response.headers.get("content-type") || "";
  if (root === "proof") {
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": responseContentType || "application/octet-stream",
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  const text = await response.text();
  if (responseContentType.includes("application/json")) {
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": responseContentType || "text/plain; charset=utf-8",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
