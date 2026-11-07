import { NextRequest, NextResponse } from "next/server";
import type { components, paths } from "@sorteos/api-client";
import { operationRoute, proxyOperation } from "@/features/admin/operations-proxy";
import { AdminError, backendClient, checked, failure, identity, jsonBody, privateHeaders, restoredAuth, sameOrigin, saveSession } from "@/features/admin/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    if (["POST", "PATCH"].includes(request.method)) sameOrigin(request);
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new AdminError("FORBIDDEN", 403);
    const { path } = await context.params;
    const [, id = "", operation = ""] = path;
    const isList = request.method === "GET" && path.length === 1 && path[0] === "orders";
    const isSession = request.method === "GET" && path.length === 1 && path[0] === "session";
    const isDetail = request.method === "GET" && path.length === 2 && path[0] === "orders" && uuid.test(id);
    const isReceipt = request.method === "GET" && path.length === 3 && path[0] === "payment-reports" && uuid.test(id) && operation === "receipt";
    const isAction = request.method === "POST" && path.length === 3 && path[0] === "orders" && uuid.test(id) && ["start-review", "approve", "request-resolution", "cancel"].includes(operation);
    const isOperation = operationRoute(request.method, path);
    if (!isList && !isSession && !isDetail && !isReceipt && !isAction && !isOperation) throw new AdminError("NOT_FOUND", 404);
    const { session, changed } = await restoredAuth();
    const admin = await identity(session.access_token);
    if (admin.mfaRequired) throw new AdminError("MFA_REQUIRED", 403);
    const client = backendClient(session.access_token);
    if (isOperation) { const response = await proxyOperation(request, path, client); if (changed) saveSession(response, session); return response; }
    let data: unknown;
    if (isSession) data = admin;
    if (isList) {
      const query: NonNullable<paths["/api/v1/admin/orders"]["get"]["parameters"]["query"]> = {};
      for (const [key, value] of request.nextUrl.searchParams) {
        if (!["page", "pageSize", "status", "raffleId", "from", "to"].includes(key) || request.nextUrl.searchParams.getAll(key).length !== 1) throw new AdminError("INVALID_REQUEST", 400);
        Object.assign(query, { [key]: ["page", "pageSize"].includes(key) ? Number(value) : value });
      }
      data = await checked(await client.GET("/api/v1/admin/orders", { params: { query } }));
    }
    if (isDetail) data = await checked(await client.GET("/api/v1/admin/orders/{id}", { params: { path: { id } } }));
    if (isReceipt) {
      const blob: unknown = await checked(await client.GET("/api/v1/admin/payment-reports/{id}/receipt", { params: { path: { id } }, parseAs: "blob" }));
      if (!(blob instanceof Blob) || !["image/png", "image/jpeg", "application/pdf"].includes(blob.type)) throw new AdminError("INVALID_RESPONSE", 502);
      const response = new NextResponse(blob, { headers: { ...privateHeaders, "Content-Type": blob.type, "Content-Disposition": 'attachment; filename="comprobante.' + (blob.type === "application/pdf" ? "pdf" : blob.type === "image/png" ? "png" : "jpg") + '"', "Content-Security-Policy": "default-src 'none'; sandbox" } });
      if (changed) saveSession(response, session); return response;
    }
    if (isAction) {
      const key = request.headers.get("idempotency-key");
      if (!key || !uuid.test(key)) throw new AdminError("INVALID_REQUEST", 400);
      const body = await jsonBody(request);
      const params = { path: { id }, header: { "Idempotency-Key": key, "idempotency-key": key } };
      // Explicit generated routes: this BFF cannot proxy arbitrary URLs or bypass NestJS validation.
      switch (operation) {
        case "start-review": data = await checked(await client.POST("/api/v1/admin/orders/{id}/start-review", { params, body: body as components["schemas"]["ReviewDto"] })); break;
        case "approve": data = await checked(await client.POST("/api/v1/admin/orders/{id}/approve", { params, body: body as unknown as components["schemas"]["ApproveDto"] })); break;
        case "request-resolution": data = await checked(await client.POST("/api/v1/admin/orders/{id}/request-resolution", { params, body: body as unknown as components["schemas"]["ResolutionDto"] })); break;
        case "cancel": data = await checked(await client.POST("/api/v1/admin/orders/{id}/cancel", { params, body: body as unknown as components["schemas"]["CancelDto"] })); break;
      }
    }
    const response = NextResponse.json(data, { headers: privateHeaders }); if (changed) saveSession(response, session); return response;
  } catch (error) { return failure(error); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
