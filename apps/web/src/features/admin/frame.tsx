"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/format";
import { LogoutButton } from "./auth";
import { AdminClientError, adminFetch, navigateAdmin } from "./client";
import type { AdminSession } from "./types";

const navigation = [
  { href: "/admin", label: "Resumen", icon: "dashboard", description: "Visión general" },
  { href: "/admin/ordenes", label: "Órdenes y revisión", icon: "orders", description: "Gestión de órdenes" },
  { href: "/admin/rifas", label: "Rifas", icon: "ticket", description: "Administración de rifas" },
  { href: "/admin/reportes", label: "Reportes", icon: "report", description: "Reportes de operación" },
] as const;
export function AdminFrame({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const path = usePathname(), [menuOpen, setMenuOpen] = useState(false);
  const active = navigation.find(item => item.href === "/admin" ? path === item.href : path.startsWith(item.href)) ?? navigation[0];
  useEffect(() => {
    const check = () => { void adminFetch("/admin/api/session").catch(error => navigateAdmin(error instanceof AdminClientError && error.code === "MFA_REQUIRED" ? "/admin/mfa" : "/admin/login")); };
    const focus = () => { if (document.visibilityState === "visible") check(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) navigateAdmin("/admin"); };
    const interval = setInterval(check, 60000), until = session.developmentAccessUntil ?? session.mfaVerifiedUntil;
    const deadline = until ? setTimeout(() => navigateAdmin("/admin/mfa"), Math.max(0, Date.parse(until) - Date.now())) : undefined;
    document.addEventListener("visibilitychange", focus); window.addEventListener("pageshow", restored);
    return () => { clearInterval(interval); clearTimeout(deadline); document.removeEventListener("visibilitychange", focus); window.removeEventListener("pageshow", restored); };
  }, [session.mfaVerifiedUntil, session.developmentAccessUntil]);
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link href="/admin" className="admin-brand" prefetch={false}><span className="admin-brand-mark">AS</span><span>AppSorteos<small>Panel de gestión</small></span></Link>
      <Button className="admin-menu-toggle" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /><span>{menuOpen ? "Cerrar navegación" : "Abrir navegación"}</span></Button>
      <div id="admin-navigation" className={`admin-sidebar-body${menuOpen ? " is-open" : ""}`}><p className="admin-nav-label">Espacio de trabajo</p><nav aria-label="Administración">{navigation.map(item => <Link key={item.href} href={item.href} prefetch={false} aria-current={active.href === item.href ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon name={item.icon} /><span>{item.label}</span></Link>)}</nav>
        <div className="admin-sidebar-footer"><span className="admin-account-icon"><Icon name="shield" /></span><div><strong>{session.role === "OWNER" ? "Propietario" : "Revisor"}</strong><small>Cuenta administrativa</small></div><LogoutButton /></div>
      </div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><span className="admin-topbar-context">Administración</span><span className="admin-breadcrumb-separator">/</span><strong>{active.description}</strong></div><Link className="admin-public-link" href="/rifas" prefetch={false}>Ver sitio público<Icon name="external" /></Link></header>
      <div className="admin-content">{session.developmentAccessUntil && <Alert title="Prueba de desarrollo sin TOTP">Acceso temporal hasta {formatDate(session.developmentAccessUntil)}. Usa únicamente datos y comprobantes DEMO; no realices transferencias bancarias.</Alert>}{children}</div>
    </div>
  </div>;
}
export function AdminPageHeading({ title, description, section = "Operación", children }: { title: string; description?: string; section?: string; children?: React.ReactNode }) {
  return <div className="admin-page-heading"><div><p className="eyebrow">{section}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="admin-heading-actions">{children}</div>}</div>;
}
export function AdminStatus({ status, children }: { status: string; children: React.ReactNode }) { return <span className="admin-status" data-status={status}>{children}</span>; }
export function AdminAuthLayout({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <div className="admin-access"><aside className="admin-access-brand"><Link href="/admin" className="admin-brand" prefetch={false}><span className="admin-brand-mark">AS</span><span>AppSorteos<small>Panel de gestión</small></span></Link><div><span className="admin-access-symbol"><Icon name="shield" /></span><h2>Tu operación,<br />en un solo lugar.</h2><p>Administra rifas, revisa órdenes y lleva el control de los pagos.</p></div><small>Acceso exclusivo para personal autorizado.</small></aside><div className="admin-access-content"><div className="admin-access-form"><p className="eyebrow">Acceso administrativo</p><h1>{title}</h1>{description && <p>{description}</p>}{children}<Link className="admin-access-back" href="/" prefetch={false}>← Volver al sitio público</Link></div></div></div>;
}
