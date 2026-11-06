"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Card, Input } from "@/components/ui";
import { authPost, navigateAdmin } from "./client";
import { useHydrated } from "@/lib/use-hydrated";

const message = (error: unknown) => error instanceof Error ? error.message : "No pudimos completar la operación.";
export function LoginForm({ canResume }: { canResume: boolean }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, values = new FormData(form); setBusy(true); setError("");
    try { const result = await authPost<{ next: string }>("login", { email: values.get("email"), password: values.get("password") }); form.reset(); navigateAdmin(result.next); }
    catch (error) { form.reset(); setError(message(error)); setBusy(false); }
  }
  async function resume() {
    setBusy(true); setError("");
    try { navigateAdmin((await authPost<{ next: string }>("refresh")).next); }
    catch (error) { setError(message(error)); setBusy(false); }
  }
  return <Card><h2>Iniciar sesión</h2><p>Solo administradores previamente autorizados. Después se solicitará el código de tu aplicación autenticadora.</p>
    {error && <Alert title="No se pudo acceder" tone="error">{error}</Alert>}
    <form method="post" onSubmit={submit} className="admin-form" aria-busy={busy}>
      <fieldset disabled={busy || !hydrated}><Input id="admin-email" name="email" type="email" label="Correo administrativo" autoComplete="username" maxLength={254} required />
        <Input id="admin-password" name="password" type="password" label="Contraseña" autoComplete="current-password" maxLength={1024} required />
        <Button type="submit">{busy ? "Verificando acceso…" : "Iniciar sesión"}</Button></fieldset>
    </form>{canResume && <Button className="button-secondary" disabled={busy || !hydrated} onClick={resume}>Continuar sesión existente</Button>}<noscript>Activa JavaScript para iniciar sesión de forma protegida.</noscript>
  </Card>;
}

export function LogoutButton() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div><Button className="button-secondary" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/admin/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (data.signedOut !== true) throw new Error();
      navigateAdmin(data.revoked === true ? "/admin/login" : "/admin/login?cierre=pendiente");
    } catch { setError("No se pudo confirmar el cierre de sesión. Reintenta."); setBusy(false); }
  }}>Cerrar sesión</Button>{error && <p role="alert">{error}</p>}</div>;
}

export function MfaForm() {
  const [factors, setFactors] = useState<{ id: string; name: string }[] | null>(null);
  const [factorId, setFactorId] = useState(""), [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    authPost<{ factors: { id: string; name: string }[] }>("factors").then(data => { if (active) { setFactors(data.factors); setFactorId(data.factors[0]?.id ?? ""); } }).catch(error => { if (active) setError(message(error)); });
    return () => { active = false; };
  }, []);
  async function enroll() {
    setBusy(true); setError("");
    try { const data = await authPost<{ factorId: string; secret: string }>("enroll"); setFactorId(data.factorId); setSecret(data.secret); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, code = String(new FormData(form).get("code")); setBusy(true); setError("");
    try { const data = await authPost<{ next: string }>("verify", { factorId, code }); setSecret(""); form.reset(); navigateAdmin(data.next); }
    catch (error) { form.reset(); setError(message(error)); setBusy(false); }
  }
  return <Card><h2>Verificación en dos pasos</h2><p>Introduce el código TOTP. La revisión financiera requiere una verificación realizada en los últimos 15 minutos.</p>
    {error && <Alert tone="error" title="No se pudo verificar">{error}</Alert>}
    {!factors && !error && <p role="status">Consultando aplicaciones registradas…</p>}
    {factors?.length === 0 && !secret && <><p>Configura una aplicación autenticadora para proteger el acceso financiero.</p><Button disabled={busy} onClick={enroll}>Configurar autenticador</Button></>}
    {secret && <Alert title="Añadir cuenta manualmente"><p>En tu aplicación autenticadora añade una cuenta TOTP llamada App Sorteos usando esta clave. No la compartas.</p><code className="admin-secret">{secret}</code><p>La clave desaparece al salir de esta pantalla.</p></Alert>}
    {factorId && <form method="post" onSubmit={verify} className="admin-form" aria-busy={busy}><fieldset disabled={busy}>
      {(factors?.length ?? 0) > 1 && <label className="field">Aplicación<select value={factorId} onChange={e => setFactorId(e.target.value)}>{factors?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
      <Input id="admin-totp" name="code" label="Código de autenticación" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" required />
      <Button type="submit">{busy ? "Verificando código…" : "Verificar código"}</Button></fieldset></form>}
    <p>Si perdiste tu autenticador, solicita recuperación al propietario por el canal previamente acordado. Esta pantalla no elimina factores ni permite saltar MFA.</p>
    <LogoutButton />
  </Card>;
}
