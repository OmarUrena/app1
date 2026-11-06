import { NextRequest, NextResponse } from "next/server";
import { AdminError, authClient, failure, identity, jsonBody, privateHeaders, restoredAuth, sameOrigin, saveSession, tokens } from "@/features/admin/server";
import { adminLoginDestination } from "@/lib/config";

// Additional per-process ceiling; Supabase Auth enforces its own provider limits.
let attempts = 0, windowStart = 0;
function throttle() {
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); attempts = 0; }
  if (++attempts > 60) throw new AdminError("RATE_LIMITED", 429);
}
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    sameOrigin(request);
    const { action } = await context.params;
    if (!["login", "logout", "refresh", "factors", "enroll", "verify"].includes(action)) throw new AdminError("NOT_FOUND", 404);
    if (action === "logout") {
      // A failed provider revocation is explicit; the local credential is still removed.
      const stored = await tokens(); let revoked = true;
      if (stored.access_token) {
        try {
          const client = authClient();
          const token = stored.refresh_token ? (await restoredAuth()).session.access_token : stored.access_token;
          const result = await client.auth.admin.signOut(token, "local");
          // An expired/invalid access JWT does not prove the provider revoked its refresh session.
          revoked = !result.error;
        } catch { revoked = false; }
      }
      const response = NextResponse.json({ signedOut: true, revoked }, { status: revoked ? 200 : 503, headers: privateHeaders });
      saveSession(response, null); return response;
    }
    throttle();
    if (action === "login") {
      const body = await jsonBody(request);
      if (Object.keys(body).some(k => !["email", "password"].includes(k)) || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254 || typeof body.password !== "string" || body.password.length < 1 || body.password.length > 1024) throw new AdminError("INVALID_REQUEST", 400);
      const client = authClient();
      const { data, error } = await client.auth.signInWithPassword({ email: body.email, password: body.password });
      if (error || !data.session) throw new AdminError(error?.status === 429 ? "RATE_LIMITED" : error?.status && error.status >= 500 ? "AUTH_UNAVAILABLE" : "INVALID_CREDENTIALS", error?.status === 429 ? 429 : error?.status && error.status >= 500 ? 503 : 401);
      let admin;
      try { admin = await identity(data.session.access_token); } catch (error) { await client.auth.signOut({ scope: "local" }); throw error; }
      const response = NextResponse.json({ next: adminLoginDestination(admin.mfaRequired, process.env) }, { headers: privateHeaders });
      saveSession(response, data.session, true); return response;
    }
    const { client, session, changed } = await restoredAuth();
    await identity(session.access_token); // AAL1 allowlist/session check before exposing factor setup.
    let payload: object = {};
    let current = session;
    if (action === "refresh") payload = { next: adminLoginDestination((await identity(session.access_token)).mfaRequired, process.env) };
    if (action === "factors" || action === "enroll") {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw new AdminError("AUTH_UNAVAILABLE", 503);
      if (action === "factors") payload = { factors: data.totp.map(f => ({ id: f.id, name: f.friendly_name ?? "Aplicación autenticadora" })) };
      else {
        if (data.totp.length) throw new AdminError("FACTOR_EXISTS", 409);
        // Remove only the user's incomplete TOTP enrollments, never verified factors.
        for (const factor of data.all.filter(f => f.factor_type === "totp" && f.status === "unverified")) {
          const result = await client.auth.mfa.unenroll({ factorId: factor.id });
          if (result.error) throw new AdminError("AUTH_UNAVAILABLE", 503);
        }
        const result = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "App Sorteos" });
        if (result.error) throw new AdminError("AUTH_UNAVAILABLE", 503);
        payload = { factorId: result.data.id, secret: result.data.totp.secret };
      }
    }
    if (action === "verify") {
      const body = await jsonBody(request);
      if (Object.keys(body).some(k => !["factorId", "code"].includes(k)) || typeof body.factorId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.factorId) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) throw new AdminError("INVALID_REQUEST", 400);
      const result = await client.auth.mfa.challengeAndVerify({ factorId: body.factorId, code: body.code });
      if (result.error) throw new AdminError(result.error.status === 429 ? "RATE_LIMITED" : "INVALID_MFA", result.error.status === 429 ? 429 : 400);
      const updated = await client.auth.getSession();
      if (!updated.data.session) throw new AdminError("UNAUTHORIZED", 401);
      current = updated.data.session;
      const admin = await identity(current.access_token);
      if (admin.mfaRequired) throw new AdminError("MFA_REQUIRED", 403);
      payload = { next: "/admin/ordenes" };
    }
    const response = NextResponse.json(payload, { headers: privateHeaders });
    if (changed || current.access_token !== session.access_token || current.refresh_token !== session.refresh_token) saveSession(response, current);
    return response;
  } catch (error) { return failure(error); }
}
