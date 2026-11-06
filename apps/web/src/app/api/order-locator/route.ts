import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const secure = process.env.NODE_ENV === "production" || ["staging", "production"].includes(process.env.APP_ENV ?? "development");
  // Next dev can canonicalize nextUrl to localhost while the browser uses 127.0.0.1.
  // Host is browser-controlled via the request URL, unlike an arbitrary JS header.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const expected = process.env.WEB_ORIGIN || `${secure ? "https:" : request.nextUrl.protocol}//${host}`;
  if (origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("orderCode" in body) || typeof body.orderCode !== "string" || !/^RF-[A-Z0-9]{16,64}$/.test(body.orderCode) || Object.keys(body).length !== 1) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  // This locator grants no access. NestJS GET still requires its own HttpOnly guest cookie.
  const response = NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("sorteos_order_locator", body.orderCode, { httpOnly: true, sameSite: "strict", secure, path: "/orden", maxAge: 86400 });
  return response;
}
